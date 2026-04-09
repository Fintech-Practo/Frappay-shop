const Joi = require("joi");

const createReviewSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().min(5).max(255).optional(),
  comment: Joi.string().min(10).max(2000).optional()
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().min(5).max(255).optional(),
  comment: Joi.string().min(10).max(2000).optional()
}).min(1);

const moderateReviewSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED").required(),
  rejection_reason: Joi.string().max(500).optional()
});

const getReviewsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().max(100).allow('', null).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  status: Joi.string().valid("APPROVED", "REJECTED", "PENDING").optional()
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  moderateReviewSchema,
  getReviewsSchema
};

