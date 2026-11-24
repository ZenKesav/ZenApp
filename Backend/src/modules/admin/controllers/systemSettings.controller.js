const AdminService = require('../services/admin.service');

const SystemSettingsController = {
  async getSettings(req, res, next) {
    try {
      const settings = await AdminService.getSystemSettings();
      return res.status(200).json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = SystemSettingsController;
