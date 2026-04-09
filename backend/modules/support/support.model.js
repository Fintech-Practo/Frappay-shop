// src/validators/support.schema.js
const Joi = require("joi");

const createSupportTicketSchema = Joi.object({
    subject: Joi.string().allow("").max(255).optional(),
    message: Joi.string().min(5).max(5000).required(),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").optional(),
    order_id: Joi.number().integer().positive().optional(), // optional, if you want link to order later
});

const updateTicketStatusSchema = Joi.object({
    status: Joi.string()
        .valid("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")
        .required(),
    resolution: Joi.string().allow("").max(5000).optional(),
    assigned_to: Joi.number().integer().positive().allow(null).optional(),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").optional(),
});

module.exports = {
    createSupportTicketSchema,
    updateTicketStatusSchema,
};