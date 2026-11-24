const logger = require('../../config/logger.config');

function errorMiddleware(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl} - ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || 'SYS_ERROR',
      message: err.message
    },
    requestId: req.id || req.headers['x-request-id'] || null
  });
}

module.exports = errorMiddleware;
