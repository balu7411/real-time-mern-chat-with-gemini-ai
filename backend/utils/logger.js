/**
 * Structured Logger with Correlation ID Support
 * Provides standardized, structured JSON logs for HTTP and WebSocket events.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL || "INFO";

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: meta.correlationId || "system",
    service: "mern-ai-backend",
    ...meta,
  });
}

const logger = {
  info: (message, meta) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.INFO) {
      console.log(formatLog("INFO", message, meta));
    }
  },
  warn: (message, meta) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.WARN) {
      console.warn(formatLog("WARN", message, meta));
    }
  },
  error: (message, meta) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.ERROR) {
      console.error(formatLog("ERROR", message, meta));
    }
  },
  debug: (message, meta) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog("DEBUG", message, meta));
    }
  },
};

module.exports = logger;
