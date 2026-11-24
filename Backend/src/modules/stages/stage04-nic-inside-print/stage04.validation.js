function validateJigSave(req, res, next) {
  const { jig_data, channels } = req.body || {};
  if (!jig_data && !channels) {
    return res.status(400).json({
      success: false,
      message: 'jig_data or channels are required to save Jig test cycle.'
    });
  }
  next();
}

module.exports = {
  validateJigSave
};
