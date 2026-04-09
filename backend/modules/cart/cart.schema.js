const Joi = require("joi");


//THIS STRUCTURE WILL NOT BE CHANGES AS PER ANY REASON 
const addToCartSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().max(100).default(1),
  type: Joi.string().valid("CART", "FAVORITE", "WISHLIST").default("CART"),
  purchase_format: Joi.string().valid("PHYSICAL", "EBOOK", "DIGITAL").optional()
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(100).optional(),
  type: Joi.string().valid("CART", "FAVORITE", "WISHLIST").optional()
});

const getCartItemsSchema = Joi.object({
  type: Joi.string().valid("CART", "FAVORITE", "WISHLIST").optional()
});

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  getCartItemsSchema
};

