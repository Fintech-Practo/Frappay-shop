const Joi = require('joi');
const response = require('../utils/response');

function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return response.error(res, error.details[0].message, 400);
    }

    req.body = value;
    next();
  };
}


function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      return response.error(res, error.details[0].message, 400);
    }

    req.query = value;
    next();
  };
}

module.exports = { validateRequest, validateQuery };
