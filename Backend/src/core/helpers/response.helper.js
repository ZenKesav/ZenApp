/**
 * Standard API Response Helper
 */
const successResponse = (res, data = {}, message = 'Operation successful', statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...meta,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error ? (error.message || error) : undefined,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse
};
