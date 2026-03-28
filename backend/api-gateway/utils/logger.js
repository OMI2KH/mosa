// api-gateway/utils/logger.js

/**
 * 📝 Enterprise Logger for Circuit Breaker
 */

class Logger {
  constructor(options = {}) {
    this.service = options.service || 'circuit-breaker';
    this.level = options.level || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  log(level, message, context = {}) {
    if (this.levels[level] > this.levels[this.level]) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.service,
      message,
      ...context
    };

    if (level === 'error' && context.error) {
      logEntry.stack = context.error.stack;
    }

    console[level](JSON.stringify(logEntry));
  }

  error(message, context) { this.log('error', message, context); }
  warn(message, context) { this.log('warn', message, context); }
  info(message, context) { this.log('info', message, context); }
  debug(message, context) { this.log('debug', message, context); }
}

module.exports = {
  Logger
};