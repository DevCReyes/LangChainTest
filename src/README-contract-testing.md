# Data Layer Contract Testing Module

This module provides contract testing capabilities for Google Tag Manager (GTM) dataLayer events, specifically designed for testing forms that are retrieved from external URLs.

## Overview

The contract testing approach validates that GTM tags fire the correct events with the expected data structure when forms are interacted with. Since you don't have direct access to the form source code, this module:

1. **Intercepts dataLayer events** - Monitors all `dataLayer.push()` calls
2. **Validates against contracts** - Ensures events match predefined schemas
3. **Simulates form interactions** - Programmatically fills and submits forms
4. **Reports validation results** - Provides detailed reports on what passed/failed

## Core Concepts

### Contracts

A contract is a schema (using Zod) that defines the expected structure of a dataLayer event. For example:

```javascript
const formSubmitContract = z.object({
  event: z.literal('formSubmit'),
  formId: z.string().min(1),
  formData: z.record(z.any()).optional(),
  success: z.boolean().optional(),
});
```

### Event Validation

When a form is interacted with, the module:
1. Captures all `dataLayer.push()` calls
2. Validates each event against its contract
3. Reports any mismatches or missing required fields

### Form Simulation

The module can simulate user interactions:
- Fill form fields
- Submit forms
- Click buttons
- Wait for events

## Installation

```bash
npm install puppeteer  # Optional, for browser automation
```

The core module works without Puppeteer for manual validation, but Puppeteer is recommended for automated testing.

## Basic Usage

### 1. Manual Event Validation (No Browser)

```javascript
const { DataLayerContractTester } = require('./data-layer-contract-tester');
const { formContracts } = require('./contracts/form-contracts');

const tester = new DataLayerContractTester();

// Register contracts
tester.defineContract('formSubmit', formContracts.formSubmit);

// Record events (simulated or from actual execution)
tester.recordEvent({
  event: 'formSubmit',
  formId: 'contact-form',
  formData: { name: 'John', email: 'john@example.com' }
});

// Validate
const report = tester.validateAll();
console.log(tester.generateReport(report));
```

### 2. Automated Testing with Puppeteer

```javascript
const { ContractTestRunner } = require('./contract-test-runner');
const { formContracts } = require('./contracts/form-contracts');
const puppeteer = require('puppeteer');

const runner = new ContractTestRunner({ verbose: true });

// Register contracts
runner.registerContracts({
  formStart: formContracts.formStart,
  formSubmit: formContracts.formSubmit,
  formSuccess: formContracts.formSuccess,
});

// Define test scenario
const scenario = {
  name: 'Test Contact Form',
  url: 'https://example.com/contact',
  steps: [
    { type: 'wait', duration: 2000 },
    { type: 'fillField', selector: 'input[name="name"]', value: 'John Doe' },
    { type: 'fillField', selector: 'input[name="email"]', value: 'john@example.com' },
    { type: 'submit', selector: 'form', options: { preventDefault: true } },
  ],
  expectedEvents: [
    { eventName: 'formStart', properties: { formId: 'contact-form' } },
    { eventName: 'formSubmit' },
  ],
};

// Run test
const browser = await puppeteer.launch();
const page = await browser.newPage();

const result = await runner.runTest(page, scenario);
console.log('Test passed:', result.validation.success);

await browser.close();
```

### 3. Using the Puppeteer Integration Helper

```javascript
const { PuppeteerContractTester } = require('./puppeteer-integration');
const { formContracts } = require('./contracts/form-contracts');

const tester = new PuppeteerContractTester({ headless: false });
tester.getRunner().registerContracts({
  formSubmit: formContracts.formSubmit,
});

const results = await tester.runTests([
  {
    name: 'My Test',
    url: 'https://example.com/form',
    steps: [/* ... */],
  },
]);

await tester.close();
```

## Creating Custom Contracts

```javascript
const { z } = require('zod');
const { createCustomContract, baseFormEvent } = require('./contracts/form-contracts');

// Create a custom contract
const customEventContract = createCustomContract('customEvent', baseFormEvent, {
  customField: z.string(),
  customNumber: z.number().optional(),
});

// Register it
tester.defineContract('customEvent', customEventContract);
```

## Test Scenario Structure

A test scenario is an object with the following structure:

```javascript
{
  name: 'Test Name',                    // Optional
  url: 'https://example.com/form',      // URL to navigate to
  timeout: 30000,                      // Optional timeout
  steps: [                              // Array of interaction steps
    {
      type: 'fillField',                // Step type
      name: 'Step description',         // Optional
      selector: 'input[name="email"]',   // CSS selector
      value: 'test@example.com',        // Value to fill
      options: {                         // Optional step options
        triggerEvents: true,
        blur: true,
      },
    },
    {
      type: 'fillForm',                 // Fill multiple fields
      fieldMap: {
        'input[name="name"]': 'John',
        'input[name="email"]': 'john@example.com',
      },
      options: { delay: 500 },
    },
    {
      type: 'submit',                   // Submit form
      selector: 'form',
      options: { preventDefault: true }, // Prevent actual submission
    },
    {
      type: 'click',                    // Click element
      selector: 'button.submit',
    },
    {
      type: 'wait',                     // Wait
      duration: 2000,
    },
    {
      type: 'waitForEvent',             // Wait for dataLayer event
      eventName: 'formSubmit',
      timeout: 5000,
    },
  ],
  expectedEvents: [                      // Optional: expected events
    {
      eventName: 'formSubmit',
      properties: { formId: 'contact-form' },
    },
  ],
}
```

## Available Step Types

- **`fillField`** - Fill a single form field
- **`fillForm`** - Fill multiple fields at once
- **`submit`** - Submit a form
- **`click`** - Click an element
- **`wait`** - Wait for a duration
- **`waitForEvent`** - Wait for a specific dataLayer event

## Predefined Contracts

The module includes several predefined contracts in `contracts/form-contracts.js`:

- `formStart` - Form interaction started
- `formSubmit` - Form submitted
- `formSuccess` - Form submission successful
- `formValidationError` - Form validation failed
- `formFieldInteraction` - Individual field interaction
- `formAbandonment` - User abandoned form

## Validation Reports

The validation report includes:

- Total events captured
- Number of passed/failed validations
- Detailed error messages for failures
- Summary by event type
- Event data for debugging

## Best Practices

1. **Start with manual validation** - Test your contracts with mock events first
2. **Use descriptive event names** - Make contracts easy to understand
3. **Test incrementally** - Start with simple scenarios, add complexity gradually
4. **Use `preventDefault: true`** - Prevent actual form submissions during testing
5. **Wait for page load** - Always include a wait step after navigation
6. **Check expected events** - Use `expectedEvents` to ensure critical events fire

## Troubleshooting

### Events not being captured

- Ensure the dataLayer mock is injected before the page loads
- Check that GTM scripts are loading correctly
- Verify selectors are correct

### Validation failures

- Check the error messages in the validation report
- Ensure your contracts match the actual event structure
- Use `.passthrough()` in Zod schemas to allow extra properties

### Form interactions not working

- Verify CSS selectors are correct
- Check if the form is loaded in an iframe (may need special handling)
- Ensure the form simulator script is injected

## Advanced Usage

### Custom Event Listeners

You can also listen for events directly in the browser:

```javascript
await page.evaluate(() => {
  window.addEventListener('dataLayerPush', (e) => {
    console.log('Event fired:', e.detail.event);
  });
});
```

### Accessing Events Programmatically

```javascript
const events = await page.evaluate(() => {
  return window.__getDataLayerEvents();
});
```

### Multiple Test Runs

```javascript
const results = await runner.runTests(page, [
  scenario1,
  scenario2,
  scenario3,
]);

const summary = runner.generateSummary(results);
console.log(`Passed: ${summary.passed}/${summary.total}`);
```

## See Also

- `example-usage.js` - Complete working examples
- `contracts/form-contracts.js` - Predefined contract schemas
- `form-simulator.js` - Form interaction utilities
