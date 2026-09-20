'use strict';

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      code,
      stack: err.stack,
      path: req.originalUrl,
    });
  } else {
    logger.warn('Request error', {
      message: err.message,
      code,
      statusCode,
      path: req.originalUrl,
    });
  }

  const body = {
    success: false,
    error: err.message || 'Internal server error',
    code,
  };

  if (err.details) body.details = err.details;
  if (err.transactionId) body.transactionId = err.transactionId;

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500 && err.stack) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
}

module.exports = { AppError, notFoundHandler, errorHandler };
