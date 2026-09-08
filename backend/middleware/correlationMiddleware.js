const crypto = require("crypto");
const logger = require("../utils/logger");

/**
 * Middleware to generate or propagate x-correlation-id across all requests
 */
function correlationMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    logger.info("HTTP Request Completed", {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      correlationId,
      ip: req.ip
    });
  });

  next();
}

module.exports = correlationMiddleware;
