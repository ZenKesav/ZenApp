const MeterModel = require('../models/Meter.model');
const redisClient = require('../../../core/cache/redisClient');

const MeterController = {
  async getMeters(req, res, next) {
    try {
      const { search, status, current_stage } = req.query;
      const meters = await MeterModel.findAll({ search, status, current_stage });
      return res.status(200).json({ success: true, count: meters.length, data: meters });
    } catch (err) {
      next(err);
    }
  },

  async getMeterByNo(req, res, next) {
    try {
      const { meterNo } = req.params;
      const cached = await redisClient.get(`meter:${meterNo}`);
      if (cached) {
        return res.status(200).json({ success: true, data: JSON.parse(cached) });
      }

      const meter = await MeterModel.findByMeterNo(meterNo);
      if (!meter) {
        return res.status(404).json({ success: false, message: `Meter '${meterNo}' not found.` });
      }

      await redisClient.set(`meter:${meterNo}`, JSON.stringify(meter), 300);
      return res.status(200).json({ success: true, data: meter });
    } catch (err) {
      next(err);
    }
  },

  async createMeter(req, res, next) {
    try {
      const { meter_no } = req.body;
      if (!meter_no) {
        return res.status(400).json({ success: false, message: 'meter_no is required' });
      }

      const existing = await MeterModel.findByMeterNo(meter_no);
      if (existing) {
        return res.status(409).json({ success: false, message: `Meter '${meter_no}' already exists.` });
      }

      await MeterModel.createMeter(req.body);
      const created = await MeterModel.findByMeterNo(meter_no);
      return res.status(201).json({ success: true, message: 'Meter created successfully', data: created });
    } catch (err) {
      next(err);
    }
  },

  async getTraceability(req, res, next) {
    try {
      const { meterNo } = req.params;
      const traceability = await MeterModel.getTraceability(meterNo);
      if (!traceability) {
        return res.status(404).json({ success: false, message: `Meter '${meterNo}' not found.` });
      }
      return res.status(200).json({ success: true, data: traceability });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = MeterController;
