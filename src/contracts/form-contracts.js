/**
 * Predefined Contract Schemas for Form Events
 * 
 * These Zod schemas define the expected structure of dataLayer events
 * that should be fired when forms are interacted with.
 */

const { z } = require('zod');

/**
 * Base form event schema - common properties for all form events
 */
const baseFormEvent = z.object({
  event: z.string(),
  formId: z.string().optional(),
  formName: z.string().optional(),
  formUrl: z.string().url().optional(),
  timestamp: z.number().optional(),
});

/**
 * Form Start Event - fired when user begins interacting with a form
 */
const formStartContract = baseFormEvent.extend({
  event: z.literal('formStart'),
  formId: z.string().min(1, 'Form ID is required'),
  formName: z.string().optional(),
  formUrl: z.string().url().optional(),
  formFields: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
});

/**
 * Form Submit Event - fired when a form is submitted
 */
const formSubmitContract = baseFormEvent.extend({
  event: z.literal('formSubmit'),
  formId: z.string().min(1, 'Form ID is required'),
  formName: z.string().optional(),
  formUrl: z.string().url().optional(),
  formData: z.record(z.any()).optional(), // Key-value pairs of form data
  formFields: z.array(z.object({
    name: z.string(),
    value: z.any(),
    type: z.string().optional(),
  })).optional(),
  success: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

/**
 * Form Field Interaction Event - fired when individual fields are interacted with
 */
const formFieldInteractionContract = baseFormEvent.extend({
  event: z.literal('formFieldInteraction'),
  formId: z.string().min(1, 'Form ID is required'),
  fieldName: z.string().min(1, 'Field name is required'),
  fieldType: z.string().optional(),
  action: z.enum(['focus', 'blur', 'change', 'input']),
  value: z.any().optional(),
});

/**
 * Form Validation Error Event - fired when form validation fails
 */
const formValidationErrorContract = baseFormEvent.extend({
  event: z.literal('formValidationError'),
  formId: z.string().min(1, 'Form ID is required'),
  fieldName: z.string().optional(), // If specific field, otherwise form-level
  errorMessage: z.string().min(1, 'Error message is required'),
  errorType: z.string().optional(), // e.g., 'required', 'format', 'custom'
});

/**
 * Form Abandonment Event - fired when user leaves form without submitting
 */
const formAbandonmentContract = baseFormEvent.extend({
  event: z.literal('formAbandonment'),
  formId: z.string().min(1, 'Form ID is required'),
  fieldsCompleted: z.number().int().min(0).optional(),
  fieldsTotal: z.number().int().min(1).optional(),
  timeSpent: z.number().min(0).optional(), // in seconds
  lastFieldInteracted: z.string().optional(),
});

/**
 * Form Success Event - fired when form submission is successful
 */
const formSuccessContract = baseFormEvent.extend({
  event: z.literal('formSuccess'),
  formId: z.string().min(1, 'Form ID is required'),
  formName: z.string().optional(),
  formUrl: z.string().url().optional(),
  submissionId: z.string().optional(),
  timestamp: z.number().optional(),
});

/**
 * Generic GTM Event - for custom events that don't fit standard patterns
 */
const genericGTMEventContract = z.object({
  event: z.string().min(1),
  // Allow any additional properties
}).passthrough();

/**
 * Export all contracts as a map for easy access
 */
const formContracts = {
  formStart: formStartContract,
  formSubmit: formSubmitContract,
  formFieldInteraction: formFieldInteractionContract,
  formValidationError: formValidationErrorContract,
  formAbandonment: formAbandonmentContract,
  formSuccess: formSuccessContract,
  generic: genericGTMEventContract,
};

/**
 * Helper function to create a custom contract
 * @param {string} eventName - The event name
 * @param {z.ZodObject} baseSchema - Base schema to extend
 * @param {object} additionalFields - Additional fields to add
 */
function createCustomContract(eventName, baseSchema = baseFormEvent, additionalFields = {}) {
  return baseSchema.extend({
    event: z.literal(eventName),
    ...additionalFields,
  });
}

module.exports = {
  formContracts,
  baseFormEvent,
  createCustomContract,
  // Individual exports for convenience
  formStartContract,
  formSubmitContract,
  formFieldInteractionContract,
  formValidationErrorContract,
  formAbandonmentContract,
  formSuccessContract,
  genericGTMEventContract,
};
