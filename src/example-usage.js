/**
 * Example Usage of Data Layer Contract Testing
 * 
 * This file demonstrates how to use the contract testing module
 * with Puppeteer to test forms and validate GTM dataLayer events.
 */

// Note: This example requires puppeteer to be installed
// npm install puppeteer

const { ContractTestRunner } = require('./contract-test-runner');
const { formContracts } = require('./contracts/form-contracts');

async function runExampleTests() {
  // Initialize the test runner
  const runner = new ContractTestRunner({
    verbose: true,
    timeout: 30000,
  });

  // Register the form contracts
  runner.registerContracts({
    formStart: formContracts.formStart,
    formSubmit: formContracts.formSubmit,
    formSuccess: formContracts.formSuccess,
    formValidationError: formContracts.formValidationError,
    formFieldInteraction: formContracts.formFieldInteraction,
  });

  // Example: Test a contact form
  const testScenarios = [
    {
      name: 'Contact Form - Successful Submission',
      url: 'https://example.com/contact', // Replace with actual form URL
      steps: [
        {
          type: 'wait',
          duration: 2000, // Wait for page to load
        },
        {
          type: 'fillField',
          name: 'Fill name field',
          selector: 'input[name="name"]',
          value: 'John Doe',
        },
        {
          type: 'fillField',
          name: 'Fill email field',
          selector: 'input[name="email"]',
          value: 'john@example.com',
        },
        {
          type: 'fillField',
          name: 'Fill message field',
          selector: 'textarea[name="message"]',
          value: 'This is a test message',
        },
        {
          type: 'submit',
          name: 'Submit form',
          selector: 'form',
          options: {
            preventDefault: true, // Prevent actual submission for testing
          },
        },
      ],
      expectedEvents: [
        {
          eventName: 'formStart',
          properties: {
            formId: 'contact-form', // Adjust based on your form
          },
        },
        {
          eventName: 'formSubmit',
          properties: {
            formId: 'contact-form',
          },
        },
      ],
    },
    {
      name: 'Contact Form - Validation Error',
      url: 'https://example.com/contact',
      steps: [
        {
          type: 'wait',
          duration: 2000,
        },
        {
          type: 'fillField',
          name: 'Fill invalid email',
          selector: 'input[name="email"]',
          value: 'invalid-email',
        },
        {
          type: 'submit',
          name: 'Submit form with invalid data',
          selector: 'form',
          options: {
            preventDefault: true,
          },
        },
      ],
      expectedEvents: [
        {
          eventName: 'formValidationError',
        },
      ],
    },
    {
      name: 'Newsletter Signup Form',
      url: 'https://example.com/newsletter',
      steps: [
        {
          type: 'wait',
          duration: 2000,
        },
        {
          type: 'fillForm',
          name: 'Fill entire form',
          fieldMap: {
            'input[name="email"]': 'user@example.com',
            'input[name="name"]': 'Jane Smith',
          },
          options: {
            delay: 500, // Delay between fields
          },
        },
        {
          type: 'click',
          name: 'Click subscribe button',
          selector: 'button[type="submit"]',
          options: {
            preventDefault: true,
          },
        },
      ],
      expectedEvents: [
        {
          eventName: 'formSubmit',
        },
      ],
    },
  ];

  // Uncomment to run with Puppeteer:
  /*
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const results = await runner.runTests(page, testScenarios);
    
    // Generate summary
    const summary = runner.generateSummary(results);
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Total Events Captured: ${summary.totalEvents}`);
    console.log(`Total Validation Errors: ${summary.totalValidationErrors}`);

    // Print detailed validation reports
    results.forEach(result => {
      if (result.validation.report) {
        const report = runner.getTester().generateReport(result.validation.report);
        console.log(report);
      }
    });

  } finally {
    await browser.close();
  }
  */

  // Example: Manual event validation (without browser)
  console.log('\n=== Manual Event Validation Example ===\n');
  
  const tester = runner.getTester();
  
  // Simulate some events
  const mockEvents = [
    {
      event: 'formStart',
      formId: 'contact-form',
      formName: 'Contact Form',
      formUrl: 'https://example.com/contact',
    },
    {
      event: 'formSubmit',
      formId: 'contact-form',
      formData: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      event: 'formSuccess',
      formId: 'contact-form',
      submissionId: 'sub-123',
    },
  ];

  // Record events
  mockEvents.forEach(event => tester.recordEvent(event));

  // Validate
  const validationReport = tester.validateAll();
  const report = tester.generateReport(validationReport);
  console.log(report);

  // Check specific events
  const submitCheck = tester.assertEventFired('formSubmit', {
    formId: 'contact-form',
  });
  console.log('\nEvent Assertion:');
  console.log(`  formSubmit fired: ${submitCheck.passed ? '✓' : '✗'}`);
  if (!submitCheck.passed) {
    console.log(`  ${submitCheck.message}`);
  }
}

// Run if executed directly
if (require.main === module) {
  runExampleTests().catch(console.error);
}

module.exports = { runExampleTests };
