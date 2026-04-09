const Joi = require("joi");

const adminActionSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required()
});

const getStatsSchema = Joi.object({
  range: Joi.string().valid('1d', '7d', '1m', '3m', '6m', '1y').default('6m'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  page: Joi.number().integer().min(1).default(1),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().optional(),
  role: Joi.string().optional(),
  threshold: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().allow('').optional()
}).unknown(true);

module.exports = {
  adminActionSchema,
  getStatsSchema
};
