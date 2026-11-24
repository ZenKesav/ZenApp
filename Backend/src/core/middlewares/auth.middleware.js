const jwt = require('jsonwebtoken');
const authConfig = require('../../config/auth.config');
const { query } = require('../database/connection');
const { verifyToken } = require('../helpers/crypto.helper');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded = verifyToken(token);
    if (!decoded) {
      try {
        decoded = jwt.verify(token, authConfig.jwtSecret);
      } catch (e) {
        decoded = null;
      }
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const user = await query.get(
      `SELECT id, employee_id, user_name, name, email, phone, role_id, role, status, stage_id, assigned_stage, assigned_by, assigned_at, reassigned_by, reassigned_at, avatar FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'User account is inactive or non-existent.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      let decoded = verifyToken(token);
      if (!decoded) {
        try {
          decoded = jwt.verify(token, authConfig.jwtSecret);
        } catch (e) {
          decoded = null;
        }
      }
      if (decoded && decoded.userId) {
        const user = await query.get(
          `SELECT id, employee_id, user_name, name, email, phone, role_id, role, status, stage_id, assigned_stage FROM users WHERE id = ?`,
          [decoded.userId]
        );
        if (user && user.status === 'ACTIVE') {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Silently continue for optional auth
  }
  next();
}

module.exports = {
  authMiddleware,
  authenticate: authMiddleware,
  optionalAuth
};
