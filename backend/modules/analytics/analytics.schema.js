const Joi = require("joi");

const analyticsSchema = Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    includeOutOfStock: Joi.boolean().default(false)
}).custom((value, helpers) => {
    // If custom date range is provided, both dates must be present
    if ((value.startDate && !value.endDate) || (!value.startDate && value.endDate)) {
        return helpers.error('custom.dateRange');
    }
    
    // If custom dates are provided, ignore period
    if (value.startDate && value.endDate) {
        delete value.period;
    }
    
    return value;
}).messages({
    'custom.dateRange': 'Both startDate and endDate must be provided when using custom date range'
});

module.exports = {
    analyticsSchema
};
