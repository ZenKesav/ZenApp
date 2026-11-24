const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const authConfig = require('../../config/auth.config');

const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, authConfig.bcryptSaltRounds || 10);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const generateToken = (user) => {
  const payload = {
    userId: user.id,
    employee_id: user.employee_id,
    role: user.role,
    exp: Date.now() + 86400000 // 24 hours
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', authConfig.jwtSecret).update(str).digest('base64url');
  return `${str}.${sig}`;
};

const verifyToken = (token) => {
  try {
    const [str, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', authConfig.jwtSecret).update(str).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};
