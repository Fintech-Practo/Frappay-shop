const Joi = require('joi');

const createReturnSchema = Joi.object({
  order_id: Joi.number().integer().required(),
  reason: Joi.string().required(),
  refund_type: Joi.string().valid('refund', 'replacement').default('refund'),
  status: Joi.string().valid(
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'RTO_COMPLETED',
    'REFUND_PENDING',
    'REFUND_PROCESSING',
    'REFUND_SETTLED',
    'REJECTED'
  ),
  admin_notes: Joi.string().allow('', null),
  images: Joi.array().items(Joi.string()).allow(null),
  bank_details: Joi.object({
    account_number: Joi.string().required(),
    ifsc_code: Joi.string().required(),
    account_holder_name: Joi.string().required(),
    bank_name: Joi.string().allow('', null)
  }).allow(null)
});

const getReturnsSchema = Joi.object({
  status: Joi.string().valid(
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'RTO_COMPLETED',
    'REFUND_PENDING',
    'REFUND_PROCESSING',
    'REFUND_SETTLED',
    'REJECTED'
  ),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0)
});

module.exports = {
  createReturnSchema,
  getReturnsSchema
};
