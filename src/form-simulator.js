/**
 * Form Simulator
 * 
 * Utilities for programmatically simulating form interactions
 * in a browser environment (via Puppeteer/Playwright).
 * 
 * This module provides functions that can be injected into a page
 * to simulate user interactions with forms.
 */

class FormSimulator {
  /**
   * Get JavaScript code to inject that simulates form interactions
   * This code should be injected into a page via Puppeteer/Playwright
   */
  static getInjectionScript() {
    return `
      (function() {
        window.__formSimulator = {
          /**
           * Fill a form field by selector
           */
          fillField: function(selector, value, options = {}) {
            const element = document.querySelector(selector);
            if (!element) {
              throw new Error(\`Field not found: \${selector}\`);
            }
            
            // Focus the field
            element.focus();
            if (options.triggerEvents !== false) {
              element.dispatchEvent(new Event('focus', { bubbles: true }));
            }
            
            // Clear existing value
            if (element.value !== undefined) {
              element.value = '';
              if (options.triggerEvents !== false) {
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
            
            // Set new value
            if (element.value !== undefined) {
              element.value = value;
            } else if (element.textContent !== undefined) {
              element.textContent = value;
            }
            
            // Trigger events
            if (options.triggerEvents !== false) {
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Blur if specified
            if (options.blur !== false) {
              element.blur();
              if (options.triggerEvents !== false) {
                element.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }
            
            return element;
          },
          
          /**
           * Fill multiple form fields at once
           */
          fillForm: function(fieldMap, options = {}) {
            const results = {};
            const delay = options.delay || 100;
            
            Object.entries(fieldMap).forEach(([selector, value], index) => {
              setTimeout(() => {
                try {
                  results[selector] = this.fillField(selector, value, options);
                } catch (error) {
                  results[selector] = { error: error.message };
                }
              }, index * delay);
            });
            
            return results;
          },
          
          /**
           * Submit a form by selector
           */
          submitForm: function(selector, options = {}) {
            const form = typeof selector === 'string' 
              ? document.querySelector(selector) 
              : selector;
            
            if (!form) {
              throw new Error(\`Form not found: \${selector}\`);
            }
            
            // Trigger submit event
            if (options.triggerEvents !== false) {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
            
            // Actually submit if not prevented
            if (!options.preventDefault) {
              form.submit();
            }
            
            return form;
          },
          
          /**
           * Click a button or element
           */
          click: function(selector, options = {}) {
            const element = document.querySelector(selector);
            if (!element) {
              throw new Error(\`Element not found: \${selector}\`);
            }
            
            if (options.triggerEvents !== false) {
              element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            }
            
            if (!options.preventDefault) {
              element.click();
            }
            
            return element;
          },
          
          /**
           * Get form data from a form element
           */
          getFormData: function(selector) {
            const form = typeof selector === 'string' 
              ? document.querySelector(selector) 
              : selector;
            
            if (!form) {
              throw new Error(\`Form not found: \${selector}\`);
            }
            
            const formData = new FormData(form);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
              if (data[key]) {
                // Handle multiple values (e.g., checkboxes)
                if (Array.isArray(data[key])) {
                  data[key].push(value);
                } else {
                  data[key] = [data[key], value];
                }
              } else {
                data[key] = value;
              }
            }
            
            return data;
          },
          
          /**
           * Get all form fields and their metadata
           */
          getFormFields: function(selector) {
            const form = typeof selector === 'string' 
              ? document.querySelector(selector) 
              : selector;
            
            if (!form) {
              throw new Error(\`Form not found: \${selector}\`);
            }
            
            const fields = Array.from(form.querySelectorAll('input, textarea, select'));
            
            return fields.map(field => ({
              name: field.name || field.id || '',
              type: field.type || field.tagName.toLowerCase(),
              required: field.required || false,
              value: field.value || '',
              selector: this._getSelector(field),
            }));
          },
          
          /**
           * Wait for a dataLayer event
           */
          waitForDataLayerEvent: function(eventName, timeout = 5000) {
            return new Promise((resolve, reject) => {
              const startTime = Date.now();
              const checkInterval = 100;
              
              const check = () => {
                const events = window.__getDataLayerEvents ? window.__getDataLayerEvents() : [];
                const matching = events.filter(e => {
                  const evt = e.event || e;
                  return (evt.event || evt.eventName) === eventName;
                });
                
                if (matching.length > 0) {
                  resolve(matching);
                  return;
                }
                
                if (Date.now() - startTime > timeout) {
                  reject(new Error(\`Timeout waiting for event: \${eventName}\`));
                  return;
                }
                
                setTimeout(check, checkInterval);
              };
              
              check();
            });
          },
          
          /**
           * Helper to generate a CSS selector for an element
           */
          _getSelector: function(element) {
            if (element.id) {
              return \`#\${element.id}\`;
            }
            if (element.name) {
              return \`[name="\${element.name}"]\`;
            }
            // Fallback to a basic selector
            return element.tagName.toLowerCase() + 
              (element.className ? '.' + element.className.split(' ')[0] : '');
          }
        };
      })();
    `;
  }

  /**
   * Create a test scenario that can be executed
   * @param {object} scenario - Scenario definition
   */
  static createScenario(scenario) {
    return {
      name: scenario.name || 'Unnamed Scenario',
      steps: scenario.steps || [],
      expectedEvents: scenario.expectedEvents || [],
      timeout: scenario.timeout || 10000,
      
      /**
       * Execute this scenario (to be used with Puppeteer/Playwright)
       */
      async execute(page) {
        const results = {
          scenario: this.name,
          steps: [],
          events: [],
          errors: [],
        };

        try {
          // Inject form simulator
          await page.evaluate(this.constructor.getInjectionScript());
          
          // Execute each step
          for (const step of this.steps) {
            try {
              const stepResult = await this._executeStep(page, step);
              results.steps.push(stepResult);
            } catch (error) {
              results.errors.push({
                step: step.name || step.type,
                error: error.message,
              });
            }
          }
          
          // Collect events
          const events = await page.evaluate(() => {
            return window.__getDataLayerEvents ? window.__getDataLayerEvents() : [];
          });
          results.events = events;
          
        } catch (error) {
          results.errors.push({
            type: 'scenario_execution',
            error: error.message,
          });
        }

        return results;
      },
      
      async _executeStep(page, step) {
        const stepResult = {
          name: step.name || step.type,
          type: step.type,
          success: false,
          result: null,
        };

        switch (step.type) {
          case 'fillField':
            stepResult.result = await page.evaluate(({ selector, value, options }) => {
              return window.__formSimulator.fillField(selector, value, options);
            }, { selector: step.selector, value: step.value, options: step.options });
            stepResult.success = true;
            break;
            
          case 'fillForm':
            stepResult.result = await page.evaluate(({ fieldMap, options }) => {
              return window.__formSimulator.fillForm(fieldMap, options);
            }, { fieldMap: step.fieldMap, options: step.options });
            stepResult.success = true;
            break;
            
          case 'submit':
            stepResult.result = await page.evaluate(({ selector, options }) => {
              return window.__formSimulator.submitForm(selector, options);
            }, { selector: step.selector, options: step.options });
            stepResult.success = true;
            break;
            
          case 'click':
            stepResult.result = await page.evaluate(({ selector, options }) => {
              return window.__formSimulator.click(selector, options);
            }, { selector: step.selector, options: step.options });
            stepResult.success = true;
            break;
            
          case 'wait':
            await page.waitForTimeout(step.duration || 1000);
            stepResult.success = true;
            break;
            
          case 'waitForEvent':
            stepResult.result = await page.evaluate(({ eventName, timeout }) => {
              return window.__formSimulator.waitForDataLayerEvent(eventName, timeout);
            }, { eventName: step.eventName, timeout: step.timeout });
            stepResult.success = true;
            break;
            
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        return stepResult;
      },
    };
  }
}

module.exports = { FormSimulator };
