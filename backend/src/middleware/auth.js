'use strict';

const jwt = require('jsonwebtoken');
const environment = require('../config/environment');

/**
 * Verify Bearer JWT and attach `req.user`.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const payload = jwt.verify(token, environment.jwtSecret);
    req.user = {
      email: payload.email,
      name: payload.name,
      role: payload.role,
      mspId: payload.mspId,
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional auth — populates req.user when a valid token is present.
 */
function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, environment.jwtSecret);
    req.user = {
      email: payload.email,
      name: payload.name,
      role: payload.role,
      mspId: payload.mspId,
    };
  } catch {
    // ignore invalid optional tokens
  }
  return next();
}

module.exports = { authenticate, optionalAuthenticate };
