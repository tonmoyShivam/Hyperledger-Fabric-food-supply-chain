'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  // Allow .local demo domains used by foodchain identities
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
});

const registerBatchSchema = Joi.object({
  batchId: Joi.string().trim().min(3).max(64).required(),
  product: Joi.string().trim().min(1).max(200).required(),
  originActor: Joi.string().trim().min(1).max(200).required(),
  originLocation: Joi.string().trim().min(1).max(200).required(),
  details: Joi.alternatives().try(Joi.object(), Joi.string()).optional(),
});

const addEventSchema = Joi.object({
  stage: Joi.string()
    .valid('PROCESSOR', 'DISTRIBUTOR', 'WALMART_STORE', 'CUSTOMER_SALE')
    .required(),
  actor: Joi.string().trim().min(1).max(200).required(),
  location: Joi.string().trim().min(1).max(200).required(),
  details: Joi.alternatives().try(Joi.object(), Joi.string()).optional(),
});

const contaminateSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required(),
  notes: Joi.string().trim().max(1000).allow('', null).optional(),
});

function validate(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const err = new Error(error.details.map((d) => d.message).join('; '));
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = error.details.map((d) => ({
      message: d.message,
      path: d.path,
    }));
    throw err;
  }
  return value;
}

module.exports = {
  loginSchema,
  registerBatchSchema,
  addEventSchema,
  contaminateSchema,
  validate,
};
