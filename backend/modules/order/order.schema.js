const Joi = require("joi");

const createOrderSchema = Joi.object({
  session_id: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
        price: Joi.number().positive().optional()
      })
    )
    .min(1)
    .optional(), // Optional because session_id can provide items
  shipping_address: Joi.string().allow("").optional(),
  payment_method: Joi.string()
    .valid("cod", "online", "wallet", "upi")
    .optional(),
  shipping_cost: Joi.number().optional(),
  shipping_method: Joi.string().optional(),
  estimated_delivery: Joi.string().optional(),

  // Rewards & Coupons
  coins_used: Joi.number().optional().default(0),
  coin_discount: Joi.number().optional().default(0),
  coupon_id: Joi.number().optional().allow(null),
  coupon_code: Joi.string().optional().allow(null, ""),
  coupon_discount: Joi.number().optional().default(0)
}).unknown(true);


const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RTO',
            'pending', 'confirmed', 'ready_to_ship', 'shipped', 'in_transit', 'delivered', 'cancelled', 'rto')
    .required()
});

const getOrdersSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "packed", "shipped", "delivered", "cancelled", "PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED")
    .optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().min(5).max(500).optional()
});

const downloadProductSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  productId: Joi.number().integer().positive().required()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrdersSchema,
  cancelOrderSchema,
  downloadProductSchema
};
