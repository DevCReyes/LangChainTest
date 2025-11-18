/**
 * Puppeteer Integration Helper
 * 
 * Convenience wrapper for using the contract tester with Puppeteer.
 * This makes it easier to set up and run tests.
 */

const puppeteer = require('puppeteer');
const { ContractTestRunner } = require('./contract-test-runner');

class PuppeteerContractTester {
  constructor(options = {}) {
    this.runner = new ContractTestRunner(options);
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless !== false, // Default to headless
      browserOptions: options.browserOptions || {},
      ...options,
    };
  }

  /**
   * Launch browser and create a page
   */
  async init() {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      ...this.options.browserOptions,
    });
    
    this.page = await this.browser.newPage();
    
    // Setup the test environment
    await this.runner.setupPage(this.page);
    
    return this.page;
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Run a test scenario
   * @param {object} scenario - Test scenario definition
   */
  async runTest(scenario) {
    if (!this.page) {
      await this.init();
    }
    
    return await this.runner.runTest(this.page, scenario);
  }

  /**
   * Run multiple test scenarios
   * @param {Array} scenarios - Array of test scenario definitions
   */
  async runTests(scenarios) {
    if (!this.page) {
      await this.init();
    }
    
    return await this.runner.runTests(this.page, scenarios);
  }

  /**
   * Get the underlying contract test runner
   */
  getRunner() {
    return this.runner;
  }

  /**
   * Static method to run tests with automatic browser management
   * @param {Array} scenarios - Test scenarios
   * @param {object} options - Options for runner and browser
   */
  static async run(scenarios, options = {}) {
    const tester = new PuppeteerContractTester(options);
    
    try {
      await tester.init();
      const results = await tester.runTests(scenarios);
      return results;
    } finally {
      await tester.close();
    }
  }
}

module.exports = { PuppeteerContractTester };
