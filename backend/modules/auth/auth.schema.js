const Joi = require("joi");
const ROLES = require("../../config/roles");

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().allow(null, '').optional(),
  phone: Joi.string().min(10).max(15).allow(null, '').optional(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(ROLES.USER, ROLES.SELLER).optional(),
  otp: Joi.string().length(6).required()
}).or('email', 'phone');

const loginSchema = Joi.object({
  email: Joi.string().email().allow(null, '').optional(),
  phone: Joi.string().min(10).max(15).allow(null, '').optional(),
  password: Joi.string().required()
}).or('email', 'phone');

const requestOTPSchema = Joi.object({
  email: Joi.string().email().allow(null, '').optional(),
  phone: Joi.string().min(10).max(15).allow(null, '').optional(),
  purpose: Joi.string().valid("REGISTRATION", "EMAIL_VERIFICATION", "PASSWORD_RESET", "ADD_PASSWORD", "CHANGE_PASSWORD").optional()
}).or('email', 'phone');

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().allow(null, '').optional(),
  phone: Joi.string().min(10).max(15).allow(null, '').optional(),
  otp: Joi.string().length(6).required(),
  purpose: Joi.string().valid("REGISTRATION", "EMAIL_VERIFICATION", "PASSWORD_RESET", "ADD_PASSWORD", "CHANGE_PASSWORD").optional()
}).or('email', 'phone');

const oauthSchema = Joi.object({
  provider: Joi.string().valid("GOOGLE", "META", "FACEBOOK").required(),
  token: Joi.string().required(),
  email: Joi.string().email().optional()
});

const addPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
  otp: Joi.string().length(6).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const changePasswordWithOTPSchema = Joi.object({
  currentPassword: Joi.string().optional(),
  newPassword: Joi.string().min(8).required(),
  otp: Joi.string().length(6).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  requestOTPSchema,
  verifyOTPSchema,
  oauthSchema,
  addPasswordSchema,
  changePasswordSchema,
  changePasswordWithOTPSchema
};