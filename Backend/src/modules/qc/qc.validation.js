function validateQcTest(req, res, next) {
  const { stage_id } = req.body || {};
  if (!stage_id) {
    return res.status(400).json({
      success: false,
      message: 'stage_id is required to record a QC Test.'
    });
  }
  next();
}

function validateInspect(req, res, next) {
  const { meter_no, status } = req.body || {};
  if (!meter_no || !status) {
    return res.status(400).json({
      success: false,
      message: 'meter_no and status are required'
    });
  }
  next();
}

module.exports = {
  validateQcTest,
  validateInspect
};
