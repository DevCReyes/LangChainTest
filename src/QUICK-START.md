# Quick Start Guide - Data Layer Contract Testing

## What Was Created

This module provides **contract testing for GTM dataLayer events** when testing forms from external URLs. Here's what you got:

### Core Files

1. **`data-layer-contract-tester.js`** - Main testing engine
   - Intercepts and records `dataLayer.push()` calls
   - Validates events against Zod schemas (contracts)
   - Generates validation reports

2. **`contracts/form-contracts.js`** - Predefined contract schemas
   - `formStart`, `formSubmit`, `formSuccess`, `formValidationError`, etc.
   - Easy to extend with custom contracts

3. **`form-simulator.js`** - Form interaction utilities
   - Fill fields, submit forms, click buttons
   - Works with Puppeteer/Playwright

4. **`contract-test-runner.js`** - Orchestrates everything
   - Sets up test environment
   - Runs scenarios and validates results

5. **`puppeteer-integration.js`** - Convenience wrapper for Puppeteer

## Quick Examples

### Example 1: Manual Validation (No Browser Needed)

```javascript
const { DataLayerContractTester } = require('./data-layer-contract-tester');
const { formContracts } = require('./contracts/form-contracts');

const tester = new DataLayerContractTester();
tester.defineContract('formSubmit', formContracts.formSubmit);

// Record an event
tester.recordEvent({
  event: 'formSubmit',
  formId: 'contact-form',
  formData: { name: 'John', email: 'john@example.com' }
});

// Validate
const report = tester.validateAll();
console.log(tester.generateReport(report));
```

### Example 2: Test a Real Form (Requires Puppeteer)

```javascript
const { ContractTestRunner } = require('./contract-test-runner');
const { formContracts } = require('./contracts/form-contracts');
const puppeteer = require('puppeteer');

const runner = new ContractTestRunner();
runner.registerContracts({
  formSubmit: formContracts.formSubmit,
  formSuccess: formContracts.formSuccess,
});

const browser = await puppeteer.launch();
const page = await browser.newPage();

const result = await runner.runTest(page, {
  name: 'Test Contact Form',
  url: 'https://example.com/contact',
  steps: [
    { type: 'fillField', selector: 'input[name="email"]', value: 'test@example.com' },
    { type: 'submit', selector: 'form', options: { preventDefault: true } },
  ],
  expectedEvents: [
    { eventName: 'formSubmit' },
  ],
});

console.log('Test passed:', result.validation.success);
await browser.close();
```

## Try It Now

Run the standalone example to see it in action:

```bash
node src/test-contracts-standalone.js
```

This demonstrates:
- ✓ Contract registration
- ✓ Event recording
- ✓ Validation (passing and failing cases)
- ✓ Event assertions

## Key Concepts

### Contracts = Schemas
A contract defines what a dataLayer event should look like. If an event doesn't match, validation fails.

### Events = dataLayer.push() calls
The module intercepts all `dataLayer.push()` calls and validates them.

### Scenarios = Test Cases
A scenario defines: what URL to test, what interactions to perform, and what events to expect.

## Next Steps

1. **Define your contracts** - Customize `form-contracts.js` for your specific events
2. **Create test scenarios** - Define the forms you want to test
3. **Run tests** - Use the test runner with Puppeteer to test real forms
4. **Review reports** - Use validation reports to debug GTM tag issues

## Documentation

See `README-contract-testing.md` for complete documentation.
