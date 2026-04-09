const Joi = require("joi");

const createCancellationSchema = Joi.object({
  order_id: Joi.number().integer().positive().required(),
  reason: Joi.string().min(10).max(1000).required()
});

const updateCancellationStatusSchema = Joi.object({
  status: Joi.string().valid("PENDING", "APPROVED", "REJECTED", "PROCESSED").required()
});

const getCancellationsSchema = Joi.object({
  status: Joi.string().valid("PENDING", "APPROVED", "REJECTED", "PROCESSED").optional(),
  order_id: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().positive().max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
});

module.exports = {
  createCancellationSchema,
  updateCancellationStatusSchema,
  getCancellationsSchema
};

