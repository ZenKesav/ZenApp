const QcService = require('./qc.service');

const QcController = {
  // Legacy queue-based QC
  async getQueue(req, res, next) {
    try {
      const queue = await QcService.getQueue();
      return res.status(200).json({ success: true, count: queue.length, queue, data: queue });
    } catch (err) {
      next(err);
    }
  },

  async inspect(req, res, next) {
    try {
      const { meter_no, inspector_id, status, remarks } = req.body || {};
      const inspector = inspector_id || req.user?.id || 'QC-INSPECTOR-01';
      const id = await QcService.inspect(meter_no, inspector, status, remarks);
      return res.status(200).json({ success: true, message: 'QC Inspection recorded', data: { id } });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  // Stage-based QC tests
  async getTests(req, res, next) {
    try {
      const filters = {
        qc_id: req.query.qc_id,
        stage_id: req.query.stage_id,
        assigned_stages: req.query.assigned_stages,
        status: req.query.status,
        search: req.query.search
      };
      const tests = await QcService.getQcTests(filters);
      res.json({
        success: true,
        count: tests.length,
        tests,
        data: tests
      });
    } catch (err) {
      next(err);
    }
  },

  async createTest(req, res, next) {
    try {
      const user = req.user || {};
      const payload = {
        qc_id: req.body.qc_id || user.employee_id || user.user_name || 'QC001',
        qc_name: req.body.qc_name || user.name || user.user_name || 'QC Inspector',
        stage_id: req.body.stage_id,
        stage_name: req.body.stage_name,
        meter_no: req.body.meter_no,
        serial_no: req.body.serial_no,
        batch_no: req.body.batch_no,
        status: req.body.status || 'PASS',
        inspection_data: req.body.inspection_data,
        remarks: req.body.remarks
      };

      if (!payload.stage_id) {
        return res.status(400).json({
          success: false,
          message: 'stage_id is required to record a QC Test.'
        });
      }

      const result = await QcService.saveQcTest(payload);
      res.status(201).json({
        success: true,
        message: 'QC Stage Inspection recorded successfully.',
        test: result,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = QcController;
