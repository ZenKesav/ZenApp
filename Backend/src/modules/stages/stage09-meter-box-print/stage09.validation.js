function validateSaveMeter(req, res, next) {
  const { meter_serial_no, meter_no, serial_no } = req.body || {};
  const serial = meter_serial_no || meter_no || serial_no;
  if (!serial || !String(serial).trim()) {
    return res.status(400).json({ success: false, message: 'meter_serial_no (or meter_no) is required' });
  }
  next();
}

module.exports = {
  validateSaveMeter
};
