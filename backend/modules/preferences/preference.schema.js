const Joi = require("joi");

/**
 * Schema for preference data structure
 * Supports: categories, product types, formats, budget, purpose, language, theme, notifications
 */
const preferenceDataSchema = Joi.object({
  // Product preferences
  interested_categories: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .messages({
      'array.base': 'Interested categories must be an array',
      'array.items': 'Each category ID must be a positive integer'
    }),

  preferred_types: Joi.array()
    .items(Joi.string().valid('BOOK', 'NOTEBOOK', 'STATIONERY'))
    .optional()
    .messages({
      'array.base': 'Preferred types must be an array',
      'array.includes': 'Product types must be one of: BOOK, NOTEBOOK, STATIONERY'
    }),

  preferred_formats: Joi.array()
    .items(Joi.string().valid('PHYSICAL', 'EBOOK'))
    .optional()
    .messages({
      'array.base': 'Preferred formats must be an array',
      'array.includes': 'Formats must be one of: PHYSICAL, EBOOK'
    }),

  // Budget range (in currency unit, e.g., INR, USD)
  budget_min: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Budget minimum must be a number',
      'number.min': 'Budget minimum cannot be negative'
    }),

  budget_max: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Budget maximum must be a number',
      'number.min': 'Budget maximum cannot be negative'
    }),

  // Purpose for using the products
  purpose: Joi.array()
    .items(Joi.string().valid('STUDY', 'EXAM', 'LEISURE', 'BUSINESS'))
    .optional()
    .messages({
      'array.base': 'Purpose must be an array',
      'array.includes': 'Purpose values must be one of: STUDY, EXAM, LEISURE, BUSINESS'
    }),

  // Language preference
  language: Joi.string()
    .valid('en', 'hi', 'es', 'fr', 'de', 'ja', 'zh')
    .optional()
    .messages({
      'string.valid': 'Language must be one of: en, hi, es, fr, de, ja, zh'
    }),

  // UI Theme preference
  theme: Joi.string()
    .valid('light', 'dark', 'auto')
    .default('auto')
    .optional()
    .messages({
      'string.valid': 'Theme must be one of: light, dark, auto'
    }),

  // Notification preferences
  notifications: Joi.object({
    email_notifications: Joi.boolean().default(true).optional(),
    push_notifications: Joi.boolean().default(true).optional(),
    newsletter: Joi.boolean().default(false).optional(),
    marketing_emails: Joi.boolean().default(false).optional(),
    recommendations: Joi.boolean().default(true).optional()
  }).optional()
});

/**
 * Schema for saving preferences (POST /me)
 * Used during preference onboarding
 */
const createPreferencesSchema = Joi.object({
  preferences: preferenceDataSchema.required().messages({
    'any.required': 'Preferences data is required'
  })
}).unknown(false);

/**
 * Schema for updating preferences (PUT /me)
 * Allows partial updates to existing preferences
 */
const updatePreferencesSchema = Joi.object({
  preferences: Joi.object({
    interested_categories: Joi.array()
      .items(Joi.number().integer().positive())
      .optional(),
    preferred_types: Joi.array()
      .items(Joi.string().valid('BOOK', 'NOTEBOOK', 'STATIONERY'))
      .optional(),
    preferred_formats: Joi.array()
      .items(Joi.string().valid('PHYSICAL', 'EBOOK'))
      .optional(),
    budget_min: Joi.number().min(0).optional(),
    budget_max: Joi.number().min(0).optional(),
    purpose: Joi.array()
      .items(Joi.string().valid('STUDY', 'EXAM', 'LEISURE', 'BUSINESS'))
      .optional(),
    language: Joi.string()
      .valid('en', 'hi', 'es', 'fr', 'de', 'ja', 'zh')
      .optional(),
    theme: Joi.string()
      .valid('light', 'dark', 'auto')
      .optional(),
    notifications: Joi.object({
      email_notifications: Joi.boolean().optional(),
      push_notifications: Joi.boolean().optional(),
      newsletter: Joi.boolean().optional(),
      marketing_emails: Joi.boolean().optional(),
      recommendations: Joi.boolean().optional()
    }).optional()
  }).min(1).required().messages({
    'object.min': 'At least one preference field must be provided',
    'any.required': 'Preferences data is required'
  })
}).unknown(false);

module.exports = {
  preferenceDataSchema,
  createPreferencesSchema,
  updatePreferencesSchema
};