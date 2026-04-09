const Joi = require("joi");

const createAddressSchema = Joi.object({
  label: Joi.string().max(50).required().messages({
    "string.empty": "Please enter a label (e.g., Home, Office)",
    "any.required": "Label is required"
  }),
  full_name: Joi.string().min(2).max(255).required(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).optional(),
  address_line1: Joi.string().min(3).max(255).required(),
  address_line2: Joi.string().max(255).optional(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  postal_code: Joi.string().min(5).max(20).required(),
  country: Joi.string().max(100).default("India"),
  is_default: Joi.boolean().default(false)
});

const updateAddressSchema = Joi.object({
  label: Joi.string().max(50).optional(),
  full_name: Joi.string().min(2).max(255).optional(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).optional(),
  address_line1: Joi.string().min(3).max(255).optional(),
  address_line2: Joi.string().max(255).optional(),
  city: Joi.string().min(2).max(100).optional(),
  state: Joi.string().min(2).max(100).optional(),
  postal_code: Joi.string().min(5).max(20).optional(),
  country: Joi.string().max(100).optional(),
  is_default: Joi.boolean().optional()
}).min(1);

module.exports = {
  createAddressSchema,
  updateAddressSchema
};

