const Joi = require("joi");

const onboardingSchema = Joi.object({
  business_name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Business name must be at least 2 characters',
    'string.max': 'Business name must not exceed 255 characters',
    'any.required': 'Business name is required'
  }),
  business_location: Joi.string().min(3).max(255).required().messages({
    'string.min': 'Business location must be at least 3 characters',
    'any.required': 'Business location is required'
  }),
  bank_account_number: Joi.string().pattern(/^\d{9,18}$/).required().messages({
    'string.pattern.base': 'Bank account number must be 9-18 digits',
    'any.required': 'Bank account number is required'
  }),
  bank_ifsc: Joi.string().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{5,6}$/).required().messages({
    'string.pattern.base': 'IFSC code must be 11 characters (e.g., SBIN0001234). Format: 4 uppercase letters + 0 + 5-6 alphanumeric characters',
    'any.required': 'IFSC code is required'
  }),
  bank_name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Bank name must be at least 2 characters',
    'any.required': 'Bank name is required'
  }),
  pan_number: Joi.string().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required().messages({
    'string.pattern.base': 'PAN number must be 10 characters (e.g., ABCDE1234F). Format: 5 uppercase letters + 4 digits + 1 uppercase letter',
    'any.required': 'PAN number is required'
  }),
  aadhaar_number: Joi.string().pattern(/^\d{12}$/).required().messages({
    'string.pattern.base': 'Aadhaar number must be exactly 12 digits',
    'any.required': 'Aadhaar number is required'
  }),
  is_books_only: Joi.boolean().default(false),
  gst_number: Joi.string().uppercase().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .when('is_books_only', { 
      is: false, 
      then: Joi.required(), 
      otherwise: Joi.optional() 
    }).messages({
    'string.pattern.base': 'Invalid GST format (Example: 29ABCDE1234F2Z5)',
    'any.required': 'GST Number is required when you are not selling only books'
  }),
  requested_commission_rate: Joi.number().min(0).max(100).optional().default(10.00),
  // Warehouse & Shipping Location
  warehouse_name: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Warehouse name is required'
  }),
  warehouse_phone: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Warehouse phone must be 10 digits',
    'any.required': 'Warehouse phone is required'
  }),
  warehouse_address: Joi.string().min(10).required().messages({
    'any.required': 'Warehouse address is required'
  }),
  warehouse_city: Joi.string().required().messages({
    'any.required': 'Warehouse city is required'
  }),
  warehouse_pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Warehouse PIN must be 6 digits',
    'any.required': 'Warehouse PIN is required'
  }),
  warehouse_email: Joi.string().email().required().messages({
    'any.required': 'Warehouse email is required'
  }),
  warehouse_country: Joi.string().default('India'),
  // Return Address
  return_address: Joi.string().min(10).required().messages({
    'any.required': 'Return address is required'
  }),
  return_city: Joi.string().required().messages({
    'any.required': 'Return city is required'
  }),
  return_state: Joi.string().required().messages({
    'any.required': 'Return state is required'
  }),
  return_pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Return PIN must be 6 digits',
    'any.required': 'Return PIN is required'
  }),
  return_country: Joi.string().default('India'),
  // Business Address & Contact
  city: Joi.string().required().messages({
    'any.required': 'Business city is required'
  }),
  pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Business PIN must be 6 digits',
    'any.required': 'Business PIN is required'
  }),
  phone: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Contact phone must be 10 digits',
    'any.required': 'Contact phone is required'
  })
});

const approveRejectSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

module.exports = {
  onboardingSchema,
  approveRejectSchema
};

