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

const getSupportTicketsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED").optional(),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").optional(),
     role: Joi.string().valid("USER", "SELLER").optional(),
    search: Joi.string().allow('', null).max(255).optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().optional()
});

module.exports = {
    createSupportTicketSchema,
    updateTicketStatusSchema,
    getSupportTicketsSchema
};
