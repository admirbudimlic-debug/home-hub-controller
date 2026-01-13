/**
 * Simple logging utility
 * Outputs timestamped logs to console
 */

const config = require('../config');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[process.env.LOG_LEVEL] || levels.info;

const formatTime = () => {
  return new Date().toISOString();
};

const log = (level, message, ...args) => {
  if (levels[level] <= currentLevel) {
    const prefix = `[${formatTime()}] [${level.toUpperCase()}]`;
    console.log(prefix, message, ...args);
  }
};

module.exports = {
  error: (message, ...args) => log('error', message, ...args),
  warn: (message, ...args) => log('warn', message, ...args),
  info: (message, ...args) => log('info', message, ...args),
  debug: (message, ...args) => log('debug', message, ...args),
};
