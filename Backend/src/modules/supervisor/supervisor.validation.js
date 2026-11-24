function validateCreateSupervisorTest(req, res, next) {
  const { stage_id } = req.body || {};
  if (!stage_id) {
    return res.status(400).json({
      success: false,
      message: 'stage_id is required to record a Supervisor Test.'
    });
  }
  next();
}

module.exports = {
  validateCreateSupervisorTest
};
