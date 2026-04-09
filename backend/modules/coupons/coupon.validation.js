const Joi = require("joi");

exports.createCouponSchema = Joi.object({

    code: Joi.string()
        .trim()
        .uppercase()
        .required(),

    description: Joi.string()
        .allow("", null),

    discount_type: Joi.string()
        .valid("percentage", "flat")
        .required(),

    discount_value: Joi.number()
        .positive()
        .required(),

    min_order_value: Joi.number()
        .min(0)
        .default(0),

    max_discount: Joi.number()
        .min(0)
        .allow(null),

    usage_limit: Joi.number()
        .integer()
        .min(1)
        .default(100),

    per_user_limit: Joi.number()
        .integer()
        .min(1)
        .default(1),

    start_date: Joi.date()
        .required(),

    expiry_date: Joi.date()
        .greater(Joi.ref("start_date"))
        .allow(null, "")
        .optional(),

    is_welcome: Joi.boolean()
        .default(false)

});