const Joi = require("joi");

const createNotificationSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(1000).required(),
  type: Joi.string()
    .valid("ORDER_UPDATE", "PROMOTION", "SYSTEM", "WISHLIST_PRICE_DROP")
    .required(),
  related_id: Joi.number().integer().positive().optional()
});

const getNotificationsSchema = Joi.object({
  unread_only: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  page: Joi.number().integer().min(1).optional(),
  offset: Joi.number().integer().min(0).optional() // Kept for backward compatibility
});

module.exports = {
  createNotificationSchema,
  getNotificationsSchema
};
