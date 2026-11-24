const AuditModel = require('../models/Audit.model');

const AuditController = {
  async getAuditLogs(req, res, next) {
    try {
      const { entity, action, limit } = req.query;
      const logs = await AuditModel.getAuditLogs({ entity, action, limit });
      return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuditController;
