const Joi = require("joi");

exports.redeemCoinsSchema = Joi.object({
    coins: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            "number.base": "Coins must be a number",
            "number.min": "Coins must be greater than 0",
            "any.required": "Coins are required"
        })
});