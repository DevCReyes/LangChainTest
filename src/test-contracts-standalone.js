/**
 * Standalone Contract Test Example
 * 
 * This demonstrates contract testing without requiring Puppeteer.
 * You can run this directly: node src/test-contracts-standalone.js
 */

const { DataLayerContractTester } = require('./data-layer-contract-tester');
const { formContracts } = require('./contracts/form-contracts');

function runStandaloneTest() {
  console.log('=== Data Layer Contract Testing - Standalone Example ===\n');

  // Initialize tester
  const tester = new DataLayerContractTester();

  // Register contracts
  console.log('1. Registering contracts...');
  tester.defineContract('formStart', formContracts.formStart, {
    description: 'Contract for form start events',
  });
  tester.defineContract('formSubmit', formContracts.formSubmit, {
    description: 'Contract for form submit events',
  });
  tester.defineContract('formSuccess', formContracts.formSuccess, {
    description: 'Contract for form success events',
  });
  tester.defineContract('formValidationError', formContracts.formValidationError, {
    description: 'Contract for form validation errors',
  });
  console.log('   ✓ Registered 4 contracts\n');

  // Simulate a complete form interaction flow
  console.log('2. Simulating form interaction events...\n');

  // Event 1: User starts filling form
  tester.recordEvent({
    event: 'formStart',
    formId: 'contact-form',
    formName: 'Contact Form',
    formUrl: 'https://example.com/contact',
    formFields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'message', type: 'textarea', required: false },
    ],
  });
  console.log('   ✓ Recorded: formStart');

  // Event 2: User submits form
  tester.recordEvent({
    event: 'formSubmit',
    formId: 'contact-form',
    formName: 'Contact Form',
    formUrl: 'https://example.com/contact',
    formData: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello, this is a test message.',
    },
    formFields: [
      { name: 'name', value: 'John Doe', type: 'text' },
      { name: 'email', value: 'john@example.com', type: 'email' },
      { name: 'message', value: 'Hello, this is a test message.', type: 'textarea' },
    ],
  });
  console.log('   ✓ Recorded: formSubmit');

  // Event 3: Form submission successful
  tester.recordEvent({
    event: 'formSuccess',
    formId: 'contact-form',
    formName: 'Contact Form',
    formUrl: 'https://example.com/contact',
    submissionId: 'sub-12345',
    timestamp: Date.now(),
  });
  console.log('   ✓ Recorded: formSuccess\n');

  // Validate all events
  console.log('3. Validating events against contracts...\n');
  const validationReport = tester.validateAll();

  // Generate and display report
  const report = tester.generateReport(validationReport);
  console.log(report);

  // Test case 2: Validation error scenario
  console.log('\n=== Testing Validation Error Scenario ===\n');

  tester.clearEvents();

  // Record a validation error event
  tester.recordEvent({
    event: 'formValidationError',
    formId: 'contact-form',
    fieldName: 'email',
    errorMessage: 'Invalid email format',
    errorType: 'format',
  });
  console.log('   ✓ Recorded: formValidationError');

  const errorValidation = tester.validateAll();
  const errorReport = tester.generateReport(errorValidation);
  console.log(errorReport);

  // Test case 3: Invalid event (missing required field)
  console.log('\n=== Testing Invalid Event (Should Fail) ===\n');

  tester.clearEvents();

  // Record an invalid event (missing required formId)
  tester.recordEvent({
    event: 'formSubmit',
    // Missing required formId field
    formData: { name: 'John' },
  });
  console.log('   ✓ Recorded: formSubmit (invalid - missing formId)');

  const invalidValidation = tester.validateAll();
  const invalidReport = tester.generateReport(invalidValidation);
  console.log(invalidReport);

  // Test case 4: Event assertions
  console.log('\n=== Testing Event Assertions ===\n');

  tester.clearEvents();

  // Record some events
  tester.recordEvent({
    event: 'formStart',
    formId: 'newsletter-form',
  });
  tester.recordEvent({
    event: 'formSubmit',
    formId: 'newsletter-form',
    formData: { email: 'user@example.com' },
  });

  // Assert events were fired
  const startCheck = tester.assertEventFired('formStart', {
    formId: 'newsletter-form',
  });
  console.log(`   formStart assertion: ${startCheck.passed ? '✓ PASSED' : '✗ FAILED'}`);
  if (!startCheck.passed) {
    console.log(`     ${startCheck.message}`);
  }

  const submitCheck = tester.assertEventFired('formSubmit', {
    formId: 'newsletter-form',
  });
  console.log(`   formSubmit assertion: ${submitCheck.passed ? '✓ PASSED' : '✗ FAILED'}`);

  const missingCheck = tester.assertEventFired('formSuccess', {});
  console.log(`   formSuccess assertion: ${missingCheck.passed ? '✓ PASSED' : '✗ FAILED'}`);
  if (!missingCheck.passed) {
    console.log(`     ${missingCheck.message}`);
  }

  console.log('\n=== Test Complete ===\n');
}

// Run the test
if (require.main === module) {
  try {
    runStandaloneTest();
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

module.exports = { runStandaloneTest };
