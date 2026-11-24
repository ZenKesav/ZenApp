const Stage10Service = require('./stage10.service');

const Stage10Controller = {
  async run(req, res, next) {
    try {
      const { meter_no, operator_id, station_id } = req.body || {};
      const result = await Stage10Service.execute(meter_no, operator_id || req.user?.id, station_id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async submitTest(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-10';
      const result = await Stage10Service.submitTest(req.body, operator, station);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async pack(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-10';
      const result = await Stage10Service.submitCarton(req.body, operator, station);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async print(req, res, next) {
    try {
      const result = await Stage10Service.printLabel(req.body);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getRecords(req, res, next) {
    try {
      const records = await Stage10Service.getRecords(req.query);
      return res.status(200).json({ success: true, records, data: records });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getStatus(req, res, next) {
    try {
      const { cartonNo } = req.params;
      const status = await Stage10Service.getStatus(cartonNo);
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = Stage10Controller;
