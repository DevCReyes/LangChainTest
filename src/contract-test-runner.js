/**
 * Contract Test Runner
 * 
 * Orchestrates form simulation, data layer monitoring, and contract validation.
 * This is the main entry point for running contract tests.
 */

const { DataLayerContractTester } = require('./data-layer-contract-tester');
const { FormSimulator } = require('./form-simulator');

class ContractTestRunner {
  constructor(options = {}) {
    this.tester = new DataLayerContractTester();
    this.simulator = FormSimulator;
    this.options = {
      timeout: options.timeout || 30000,
      verbose: options.verbose || false,
      ...options,
    };
  }

  /**
   * Register contracts from a contracts object
   * @param {object} contracts - Object mapping event names to Zod schemas
   */
  registerContracts(contracts) {
    Object.entries(contracts).forEach(([eventName, schema]) => {
      this.tester.defineContract(eventName, schema, {
        description: `Contract for ${eventName} event`,
      });
    });
  }

  /**
   * Setup the test environment in a browser page
   * This should be called with a Puppeteer/Playwright page object
   * @param {object} page - Puppeteer/Playwright page object
   */
  async setupPage(page) {
    // Inject data layer mock
    const dataLayerScript = this.tester.createMockDataLayer();
    await page.evaluateOnNewDocument(dataLayerScript);
    
    // Inject form simulator
    const simulatorScript = this.simulator.getInjectionScript();
    await page.evaluateOnNewDocument(simulatorScript);
    
    if (this.options.verbose) {
      console.log('✓ Test environment setup complete');
    }
  }

  /**
   * Run a test scenario and validate contracts
   * @param {object} page - Puppeteer/Playwright page object
   * @param {object} scenario - Test scenario definition
   * @returns {object} Test results
   */
  async runTest(page, scenario) {
    const testResults = {
      scenario: scenario.name || 'Unnamed Test',
      timestamp: Date.now(),
      setup: { success: false },
      execution: { success: false, steps: [] },
      validation: { success: false, report: null },
      events: [],
      errors: [],
    };

    try {
      // Setup page if not already done
      await this.setupPage(page);
      testResults.setup.success = true;

      // Navigate to URL if provided
      if (scenario.url) {
        await page.goto(scenario.url, { 
          waitUntil: 'networkidle2',
          timeout: this.options.timeout 
        });
        
        // Wait a bit for any initial scripts to load
        await page.waitForTimeout(1000);
      }

      // Create and execute scenario
      const formScenario = this.simulator.createScenario(scenario);
      const executionResults = await formScenario.execute(page);
      
      testResults.execution = executionResults;
      testResults.execution.success = executionResults.errors.length === 0;

      // Retrieve events from page
      const events = await page.evaluate(() => {
        return window.__getDataLayerEvents ? window.__getDataLayerEvents() : [];
      });
      
      testResults.events = events;

      // Validate events against contracts
      const validationReport = this.tester.validateAll(events);
      testResults.validation.report = validationReport;
      testResults.validation.success = validationReport.failed === 0;

      // Check expected events if specified
      if (scenario.expectedEvents && scenario.expectedEvents.length > 0) {
        const eventChecks = scenario.expectedEvents.map(expected => {
          return this.tester.assertEventFired(
            expected.eventName,
            expected.properties || {}
          );
        });

        testResults.validation.eventChecks = eventChecks;
        const allEventsFound = eventChecks.every(check => check.passed);
        
        if (!allEventsFound) {
          testResults.validation.success = false;
        }
      }

    } catch (error) {
      testResults.errors.push({
        type: 'test_execution',
        message: error.message,
        stack: error.stack,
      });
      testResults.execution.success = false;
    }

    return testResults;
  }

  /**
   * Run multiple test scenarios
   * @param {object} page - Puppeteer/Playwright page object
   * @param {Array} scenarios - Array of test scenario definitions
   * @returns {Array} Array of test results
   */
  async runTests(page, scenarios) {
    const results = [];
    
    for (const scenario of scenarios) {
      if (this.options.verbose) {
        console.log(`\nRunning test: ${scenario.name || 'Unnamed'}`);
      }
      
      const result = await this.runTest(page, scenario);
      results.push(result);
      
      if (this.options.verbose) {
        this._logTestResult(result);
      }
    }

    return results;
  }

  /**
   * Generate a summary report for multiple test results
   * @param {Array} results - Array of test results
   * @returns {object} Summary report
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      totalEvents: 0,
      totalValidationErrors: 0,
      scenarios: [],
    };

    results.forEach(result => {
      const passed = 
        result.setup.success &&
        result.execution.success &&
        result.validation.success;

      if (passed) {
        summary.passed++;
      } else {
        summary.failed++;
      }

      summary.totalEvents += result.events.length;
      
      if (result.validation.report) {
        summary.totalValidationErrors += result.validation.report.failed;
      }

      summary.scenarios.push({
        name: result.scenario,
        passed,
        events: result.events.length,
        errors: result.errors.length,
        validationErrors: result.validation.report?.failed || 0,
      });
    });

    return summary;
  }

  /**
   * Print a formatted test result
   * @param {object} result - Test result object
   */
  _logTestResult(result) {
    const status = 
      result.setup.success &&
      result.execution.success &&
      result.validation.success
        ? '✓ PASSED' 
        : '✗ FAILED';

    console.log(`  ${status}: ${result.scenario}`);
    console.log(`    Events captured: ${result.events.length}`);
    
    if (result.validation.report) {
      console.log(`    Validation: ${result.validation.report.passed}/${result.validation.report.total} passed`);
    }
    
    if (result.errors.length > 0) {
      console.log(`    Errors: ${result.errors.length}`);
      result.errors.forEach(err => {
        console.log(`      - ${err.message || err.type}`);
      });
    }
  }

  /**
   * Get the contract tester instance (for advanced usage)
   */
  getTester() {
    return this.tester;
  }
}

module.exports = { ContractTestRunner };
