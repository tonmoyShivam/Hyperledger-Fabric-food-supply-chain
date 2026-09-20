'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const { DEMO_USERS, getUserByEmail } = require('../config/fabric');
const { validate, loginSchema } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/** Password for all demo users */
const DEMO_PASSWORD = 'Password123!';

/**
 * Pre-computed bcrypt hash for "Password123!" (cost 10).
 * Regenerated at module load so hashes stay valid across bcryptjs versions.
 */
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

/** In-memory credential store keyed by email */
const credentialStore = new Map();

function seedDemoUsers() {
  for (const user of Object.values(DEMO_USERS)) {
    credentialStore.set(user.email.toLowerCase(), {
      ...user,
      passwordHash: DEMO_PASSWORD_HASH,
    });
  }
  logger.info('Demo users seeded', {
    count: credentialStore.size,
    password: DEMO_PASSWORD,
  });
}

// Always seed demo identities for local/dev API auth (Fabric still requires real network).
seedDemoUsers();

function signToken(user) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      role: user.role,
      mspId: user.mspId,
    },
    environment.jwtSecret,
    { expiresIn: environment.jwtExpiresIn }
  );
}

async function login(req, res, next) {
  try {
    const { email, password } = validate(loginSchema, req.body);
    const record = credentialStore.get(email.toLowerCase());

    if (!record) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const match = await bcrypt.compare(password, record.passwordHash);
    if (!match) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = {
      email: record.email,
      name: record.name,
      role: record.role,
      mspId: record.mspId,
    };

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user,
      expiresIn: environment.jwtExpiresIn,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const profile = getUserByEmail(req.user.email) || req.user;
    res.json({
      success: true,
      user: {
        email: profile.email,
        name: profile.name,
        role: profile.role,
        mspId: profile.mspId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  me,
  DEMO_PASSWORD,
  seedDemoUsers,
};
