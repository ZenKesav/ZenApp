const AdminService = require('../services/admin.service');

const ShiftManagementController = {
  async getShifts(req, res, next) {
    try {
      const shifts = await AdminService.getShifts();
      return res.status(200).json({ success: true, count: shifts.length, data: shifts });
    } catch (err) {
      next(err);
    }
  },

  async getShiftById(req, res, next) {
    try {
      const shift = await AdminService.getShiftById(req.params.id);
      return res.status(200).json({ success: true, data: shift });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  },

  async createShift(req, res, next) {
    try {
      const shift = await AdminService.createShift(req.body);
      return res.status(201).json({ success: true, message: 'Shift created successfully', data: shift });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateShift(req, res, next) {
    try {
      const shift = await AdminService.updateShift(req.params.id, req.body);
      return res.status(200).json({ success: true, message: 'Shift updated successfully', data: shift });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body || {};
      await AdminService.updateShiftStatus(req.params.id, status);
      return res.status(200).json({ success: true, message: 'Shift status updated successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteShift(req, res, next) {
    try {
      await AdminService.deleteShift(req.params.id);
      return res.status(200).json({ success: true, message: 'Shift deleted successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = ShiftManagementController;
