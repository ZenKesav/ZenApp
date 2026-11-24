const AdminService = require('../services/admin.service');
const StageMasterModel = require('../models/StageMaster.model');

const StageManagementController = {
  async getStages(req, res, next) {
    try {
      const stages = await StageMasterModel.getStageManagement();
      return res.status(200).json({ success: true, count: stages.length, data: stages, stages });
    } catch (err) {
      next(err);
    }
  },

  async createStage(req, res, next) {
    try {
      const id = await StageMasterModel.createStage(req.body);
      const stageNum = req.body.stage_number || '';
      return res.status(201).json({
        success: true,
        message: `Production Stage #${stageNum} created successfully!`,
        data: { id }
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateStage(req, res, next) {
    try {
      const result = await StageMasterModel.updateStage(req.params.id, req.body);
      const message = result?.swapped
        ? `Stage #${result.newStageNum} updated successfully! (Swapped positions with Stage #${result.oldStageNum}: ${result.swappedWithStageName})`
        : `Stage #${result.newStageNum || req.body.stage_number} updated successfully!`;
      return res.status(200).json({ success: true, message, data: result, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteStage(req, res, next) {
    try {
      await StageMasterModel.deleteStage(req.params.id);
      return res.status(200).json({ success: true, message: 'Production stage deleted successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getWorkForms(req, res, next) {
    try {
      const forms = await AdminService.getWorkForms(req.query);
      return res.status(200).json({ success: true, data: forms });
    } catch (err) {
      next(err);
    }
  },

  async createWorkForm(req, res, next) {
    try {
      const id = await AdminService.createWorkForm(req.body);
      return res.status(201).json({ success: true, message: 'Work form created', data: { id } });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = StageManagementController;
