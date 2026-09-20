'use strict';

const environment = require('../config/environment');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[environment.logLevel] ?? LEVELS.info;

function format(level, message, meta) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (meta !== undefined) entry.meta = meta;
  return JSON.stringify(entry);
}

function write(level, message, meta) {
  if ((LEVELS[level] ?? 99) > current) return;
  const line = format(level, message, meta);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};

module.exports = logger;
