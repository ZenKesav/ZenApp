// In-memory request limiter to prevent Jig flooding
const requestCounts = new Map();

function rateLimiterMiddleware(limit = 120, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, { count: 1, startTime: now });
      return next();
    }

    const clientData = requestCounts.get(ip);
    if (now - clientData.startTime > windowMs) {
      clientData.count = 1;
      clientData.startTime = now;
      return next();
    }

    clientData.count++;
    if (clientData.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.'
      });
    }

    next();
  };
}

module.exports = rateLimiterMiddleware;
