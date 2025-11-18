/**
 * Data Layer Contract Tester
 * 
 * This module provides contract testing for Google Tag Manager dataLayer events.
 * It intercepts dataLayer.push() calls, records them, and validates them against
 * predefined contracts (schemas) to ensure GTM tags execute correctly.
 */

const { z } = require('zod');

class DataLayerContractTester {
  constructor() {
    this.events = [];
    this.contracts = new Map();
    this.originalDataLayer = null;
    this.isRecording = false;
  }

  /**
   * Initialize the data layer mock in a browser-like environment
   * This would typically be injected into a page via Puppeteer/Playwright
   */
  createMockDataLayer() {
    return `
      (function() {
        window.dataLayer = window.dataLayer || [];
        const originalPush = window.dataLayer.push;
        const events = [];
        
        window.dataLayer.push = function(...args) {
          const event = args[0];
          events.push({
            timestamp: Date.now(),
            event: event,
            fullArgs: args
          });
          
          // Call original push if it exists, otherwise just store
          if (typeof originalPush === 'function') {
            originalPush.apply(window.dataLayer, args);
          }
          
          // Dispatch custom event for testing
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('dataLayerPush', {
              detail: { event, events }
            }));
          }
        };
        
        // Expose events for retrieval
        window.__dataLayerTestEvents = events;
        window.__getDataLayerEvents = function() {
          return JSON.parse(JSON.stringify(events));
        };
      })();
    `;
  }

  /**
   * Define a contract for a specific dataLayer event
   * @param {string} eventName - The event name (e.g., 'formSubmit', 'formStart')
   * @param {z.ZodSchema} schema - Zod schema defining the expected structure
   * @param {object} options - Additional options (required, description, etc.)
   */
  defineContract(eventName, schema, options = {}) {
    this.contracts.set(eventName, {
      schema,
      required: options.required ?? true,
      description: options.description || '',
      validateOn: options.validateOn || 'event', // 'event' or 'property'
    });
  }

  /**
   * Validate a single event against its contract
   * @param {object} event - The dataLayer event object
   * @returns {object} Validation result
   */
  validateEvent(event) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      event: event
    };

    // Extract event name - could be in 'event' property or as the first key
    let eventName = event.event || event.eventName || null;
    
    // If no explicit event name, try to infer from structure
    if (!eventName && Object.keys(event).length === 1) {
      eventName = Object.keys(event)[0];
    }

    if (!eventName) {
      results.valid = false;
      results.errors.push('Event name could not be determined');
      return results;
    }

    const contract = this.contracts.get(eventName);
    
    if (!contract) {
      if (this.contracts.size > 0) {
        results.warnings.push(`No contract defined for event: ${eventName}`);
      }
      return results;
    }

    // Validate against schema
    const validation = contract.schema.safeParse(event);
    
    if (!validation.success) {
      results.valid = false;
      results.errors.push(
        `Contract validation failed for "${eventName}":`,
        ...validation.error.errors.map(err => 
          `  - ${err.path.join('.')}: ${err.message}`
        )
      );
    } else {
      results.validatedData = validation.data;
    }

    return results;
  }

  /**
   * Validate all recorded events against their contracts
   * @param {Array} events - Array of event objects (optional, uses internal if not provided)
   * @returns {object} Validation report
   */
  validateAll(events = null) {
    const eventsToValidate = events || this.events;
    const report = {
      total: eventsToValidate.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      results: [],
      summary: {}
    };

    eventsToValidate.forEach((eventObj, index) => {
      const event = eventObj.event || eventObj;
      const result = this.validateEvent(event);
      
      report.results.push({
        index,
        timestamp: eventObj.timestamp || Date.now(),
        ...result
      });

      if (result.valid) {
        report.passed++;
      } else {
        report.failed++;
      }
      
      if (result.warnings.length > 0) {
        report.warnings += result.warnings.length;
      }

      // Track by event name
      const eventName = event.event || event.eventName || 'unknown';
      if (!report.summary[eventName]) {
        report.summary[eventName] = { total: 0, passed: 0, failed: 0 };
      }
      report.summary[eventName].total++;
      if (result.valid) {
        report.summary[eventName].passed++;
      } else {
        report.summary[eventName].failed++;
      }
    });

    return report;
  }

  /**
   * Record an event (typically called from browser context)
   * @param {object} event - The event to record
   */
  recordEvent(event) {
    this.events.push({
      timestamp: Date.now(),
      event: event
    });
  }

  /**
   * Clear all recorded events
   */
  clearEvents() {
    this.events = [];
  }

  /**
   * Get all recorded events
   * @returns {Array} Array of recorded events
   */
  getEvents() {
    return [...this.events];
  }

  /**
   * Get events filtered by event name
   * @param {string} eventName - The event name to filter by
   * @returns {Array} Filtered events
   */
  getEventsByName(eventName) {
    return this.events.filter(e => {
      const event = e.event || e;
      return (event.event || event.eventName) === eventName;
    });
  }

  /**
   * Assert that a specific event was fired with expected properties
   * @param {string} eventName - Expected event name
   * @param {object} expectedProperties - Expected properties (partial match)
   * @returns {object} Assertion result
   */
  assertEventFired(eventName, expectedProperties = {}) {
    const matchingEvents = this.getEventsByName(eventName);
    
    if (matchingEvents.length === 0) {
      return {
        passed: false,
        message: `Expected event "${eventName}" was not fired`,
        found: []
      };
    }

    // Check if any event matches the expected properties
    const matches = matchingEvents.filter(e => {
      const event = e.event || e;
      return Object.keys(expectedProperties).every(key => {
        return event[key] === expectedProperties[key];
      });
    });

    if (matches.length === 0) {
      return {
        passed: false,
        message: `Event "${eventName}" was fired but didn't match expected properties`,
        expected: expectedProperties,
        found: matchingEvents.map(e => e.event || e)
      };
    }

    return {
      passed: true,
      message: `Event "${eventName}" was fired with expected properties`,
      matches: matches.map(e => e.event || e)
    };
  }

  /**
   * Generate a human-readable report
   * @param {object} validationReport - The validation report from validateAll()
   * @returns {string} Formatted report
   */
  generateReport(validationReport) {
    let report = '\n=== Data Layer Contract Test Report ===\n\n';
    report += `Total Events: ${validationReport.total}\n`;
    report += `Passed: ${validationReport.passed}\n`;
    report += `Failed: ${validationReport.failed}\n`;
    report += `Warnings: ${validationReport.warnings}\n\n`;

    if (Object.keys(validationReport.summary).length > 0) {
      report += 'Summary by Event Type:\n';
      report += '─'.repeat(50) + '\n';
      Object.entries(validationReport.summary).forEach(([eventName, stats]) => {
        report += `  ${eventName}: ${stats.passed}/${stats.total} passed\n`;
      });
      report += '\n';
    }

    if (validationReport.failed > 0) {
      report += 'Failed Validations:\n';
      report += '─'.repeat(50) + '\n';
      validationReport.results
        .filter(r => !r.valid)
        .forEach((result, idx) => {
          report += `\n[${idx + 1}] Event at index ${result.index}:\n`;
          report += `  Errors:\n`;
          result.errors.forEach(err => {
            report += `    ${err}\n`;
          });
          report += `  Event Data: ${JSON.stringify(result.event, null, 2)}\n`;
        });
    }

    return report;
  }
}

module.exports = { DataLayerContractTester };
