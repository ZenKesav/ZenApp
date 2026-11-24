function validateLoginInput(req, res, next) {
  const { identifier, username, employee_id, email, password } = req.body || {};
  const loginTerm = identifier || username || employee_id || email;

  if (!loginTerm || !loginTerm.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID, Username, or Email is required.'
    });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Password is required.'
    });
  }

  next();
}

module.exports = {
  validateLoginInput
};
