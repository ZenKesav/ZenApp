const AssignmentModel = require('../models/Assignment.model');
const { broadcastLiveMetrics } = require('../../../core/services/socket.service');

const AssignmentController = {
  async getAssignments(req, res, next) {
    try {
      const { operator_id } = req.query;
      const assignments = await AssignmentModel.findByOperator(operator_id);
      return res.status(200).json({ success: true, count: assignments.length, data: assignments });
    } catch (err) {
      next(err);
    }
  },

  async assignStage(req, res, next) {
    try {
      const { operator_id, stage_id, station_id } = req.body;
      if (!operator_id || !stage_id) {
        return res.status(400).json({ success: false, message: 'operator_id and stage_id are required' });
      }

      const id = await AssignmentModel.assignStage(operator_id, stage_id, station_id);
      broadcastLiveMetrics({
        event: 'STAGE_ASSIGNMENT_UPDATED',
        stage_id,
        operator_id,
        station_id
      });

      return res.status(200).json({
        success: true,
        message: 'Stage assigned successfully',
        data: { id, stage_id, operator_id, station_id }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AssignmentController;
