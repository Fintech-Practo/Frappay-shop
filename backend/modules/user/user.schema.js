const Joi = require("joi");

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).allow('').optional(),
  phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).allow('').empty('').optional(),
  address_line1: Joi.string().max(500).allow('').optional(),
  city: Joi.string().max(100).allow('').optional(),
  state: Joi.string().max(100).allow('').optional(),
  postal_code: Joi.string().pattern(/^\d{6}$/).allow('').empty('').optional(),
  location: Joi.string().max(200).allow('').optional(),
  profile_image: Joi.any().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').allow('').empty('').optional(),
  date_of_birth: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('').empty('')
  ).optional(),
  currentPassword: Joi.string().min(8).max(100).when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  newPassword: Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional(),
  password: Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'New password is required'
  })
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().when('$userHasPassword', {
    is: true,
    then: Joi.required().messages({
      'string.empty': 'Password is required to delete account',
      'any.required': 'Password is required to delete account'
    }),
    otherwise: Joi.optional()
  })
});

const updatePreferencesSchema = Joi.object({
  preferences: Joi.object({
    email_notifications: Joi.boolean().optional(),
    push_notifications: Joi.boolean().optional(),
    newsletter: Joi.boolean().optional(),
    marketing_emails: Joi.boolean().optional(),
    language: Joi.string().valid('en', 'hi', 'es', 'fr').optional(),
    currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
    theme: Joi.string().valid('light', 'dark', 'auto').optional()
  }).required()
});

module.exports = {
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
  deleteAccountSchema
};
