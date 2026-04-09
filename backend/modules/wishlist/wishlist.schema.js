const Joi = require('joi');

const addToWishlistSchema = Joi.object({
    product_id: Joi.number().integer().positive().required()
});

const getWishlistSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  category: Joi.string().max(50).optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional()
});

module.exports = {
    addToWishlistSchema,
    getWishlistSchema
};
