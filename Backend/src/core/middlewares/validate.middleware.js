function validateMiddleware(schema) {
  return (req, res, next) => {
    if (!schema) return next();
    if (typeof schema.validate === 'function') {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details?.[0]?.message || 'Validation failed'
        });
      }
    }
    next();
  };
}

module.exports = validateMiddleware;
