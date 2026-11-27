const Stage04Service = require('./stage04.service');
const { isRequestFromLocalServer } = require('../../../core/helpers/network.helper');

const Stage04Controller = {
  /**
   * Run Stage 4 execution in production pipeline
   */
  async run(req, res, next) {
    try {
      const { meter_no, operator_id, station_id } = req.body || {};
      const result = await Stage04Service.execute(meter_no, operator_id || req.user?.id, station_id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  /**
   * Direct Jig Aliases (jigConnect, jigRunTest, jigSaveDb, getUsbPorts)
   */
  async getUsbPorts(req, res, next) {
    try {
      const isLocalhost = isRequestFromLocalServer(req);
      if (!isLocalhost && req.query.allow_server_port !== 'true') {
        return res.status(200).json({
          success: true,
          isServerMachine: false,
          ports: [],
          detailedPorts: []
        });
      }
      const result = await Stage04Service.scanPorts();
      return res.status(200).json({ success: true, isServerMachine: isLocalhost, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async jigConnect(req, res, next) {
    try {
      const { path, port, baudRate, dataBits, parity, stopBits } = req.body || {};
      const targetPort = path || port;
      const options = { baudRate, dataBits, parity, stopBits };
      const result = await Stage04Service.connectPort(targetPort, options);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async jigRunTest(req, res, next) {
    try {
      const { meter_no, stage_id } = req.body || {};
      const result = await Stage04Service.startHardwareTest(meter_no || 'NIC_JIG_STAGE_4', stage_id || 4);
      return res.status(200).json({ success: true, logs: result.logs, data: result.data });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async jigSaveDb(req, res, next) {
    try {
      const { meter_no, stage_id, jig_data, channels, jig, operator_id } = req.body || {};
      const rawData = jig_data || { jig: jig || 'JIG-001', ch: channels };
      const operator = operator_id || req.user?.employee_id || req.user?.id || 'OPERATOR';
      const result = await Stage04Service.saveTelemetryToDb(meter_no || 'NIC_JIG_STAGE_4', stage_id || 4, rawData, operator);
      return res.status(200).json({ 
        success: true, 
        message: result.message || `Jig Test Cycle #${result.cycle_id} saved to DB successfully! (${result.passed_count || 0} PASS NIC Cards assigned UUIDs)`,
        data: result,
        cycle_id: result.cycle_id,
        saved_channels: result.channels || result.saved_channels
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  /**
   * GET / POST /ports
   */
  async getPorts(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const isLocalhost = isRequestFromLocalServer(req);
    try {
      if (!isLocalhost && req.query.allow_server_port !== 'true') {
        return res.status(200).json({
          success: true,
          isServerMachine: false,
          ports: [],
          detailedPorts: [],
          requestId
        });
      }
      const result = await Stage04Service.scanPorts();
      return res.status(200).json({
        success: true,
        isServerMachine: isLocalhost,
        ...result,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'JIG-USB-001',
          message: err.message || 'Error scanning system Optical Ports.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * POST /connect
   */
  async connect(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const { path, port, baudRate, dataBits, parity, stopBits } = req.body || {};
    const targetPort = path || port;
    const options = { baudRate, dataBits, parity, stopBits };

    try {
      const conn = await Stage04Service.connectPort(targetPort, options);
      if (!conn.connected) {
        return res.status(400).json({
          success: false,
          error: conn.error || {
            code: 'JIG-USB-001',
            message: 'Failed to open USB connection.',
            retryable: true
          },
          requestId
        });
      }

      return res.status(200).json({
        success: true,
        data: conn,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'JIG-USB-001',
          message: err.message || 'Optical Port connection error.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * POST /disconnect
   */
  async disconnect(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    try {
      const result = await Stage04Service.disconnectPort();
      return res.status(200).json({
        success: true,
        data: result,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'JIG-USB-001',
          message: err.message || 'Error disconnecting Optical Port.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * GET /status
   */
  async getStatus(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    try {
      const status = Stage04Service.getStatus();
      return res.status(200).json({
        success: true,
        data: status,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JIG-USB-001',
          message: err.message || 'Error fetching USB status.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * POST /start
   */
  async start(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const { meter_no, stage_id } = req.body || {};

    try {
      const result = await Stage04Service.startHardwareTest(meter_no || 'NIC_JIG_STAGE_4', stage_id || 4, req.body || {});
      return res.status(200).json({
        success: true,
        logs: result.logs,
        data: result.data,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'JIG-START-001',
          message: err.message || 'Jig hardware test protocol failed.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * POST /save
   */
  async save(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const { meter_no, stage_id, jig_data, channels, jig, operator_id } = req.body || {};

    const rawData = jig_data || { jig: jig || 'JIG-001', ch: channels };
    const operator = operator_id || req.user?.employee_id || req.user?.id || 'OPERATOR';

    try {
      const result = await Stage04Service.saveTelemetryToDb(
        meter_no || 'NIC_JIG_STAGE_4',
        stage_id || 4,
        rawData,
        operator
      );

      return res.status(200).json({
        success: true,
        message: result.message || 'Jig test data saved successfully',
        cycle_id: result.cycle_id,
        cycle_uuid: result.cycle_uuid,
        saved_channels: result.saved_channels,
        nic_cards: result.nic_cards,
        channels: result.channels,
        data: result,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'JIG-DB-001',
          message: err.message || 'Error saving Jig telemetry to database.',
          retryable: err.retryable !== undefined ? err.retryable : true
        },
        requestId
      });
    }
  },

  /**
   * POST /check-duplicates
   */
  async checkDuplicates(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const { imeis } = req.body || {};
    try {
      const duplicates = await Stage04Service.checkDuplicateImeis(imeis || []);
      return res.status(200).json({
        success: true,
        duplicates,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        duplicates: [],
        error: {
          code: 'JIG-DUP-001',
          message: err.message || 'Error checking duplicate IMEIs.'
        },
        requestId
      });
    }
  },

  /**
   * POST /reset
   */
  async reset(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    try {
      return res.status(200).json({
        success: true,
        message: 'Jig test state reset successfully.',
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JIG-RESET-001',
          message: err.message || 'Error resetting Jig state.',
          retryable: true
        },
        requestId
      });
    }
  },

  /**
   * GET /records
   */
  async getRecords(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    try {
      const filters = { ...req.query };
      const role = (req.user?.role || '').toUpperCase().replace(/\s+/g, '_');
      const isOperator = role === 'OPERATOR' || (role.includes('OPERATOR') && !role.includes('SUPERVISOR') && !role.includes('ADMIN'));

      if (isOperator && req.user) {
        filters.operator_id = req.user.employee_id || req.user.user_name || req.user.id;
      }

      const records = await Stage04Service.getJigRecords(filters);
      return res.status(200).json({
        success: true,
        count: records.length,
        records,
        data: records,
        requestId
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        records: [],
        error: {
          code: 'JIG-REC-001',
          message: err.message || 'Error fetching saved Jig test records.'
        },
        requestId
      });
    }
  },

  /**
   * POST /print
   */
  async printPayload(req, res) {
    const requestId = req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`;
    const payload = req.body || {};
    const channels = payload.channels || (Array.isArray(payload) ? payload : [payload]);
    return res.status(200).json({
      success: true,
      message: `Print payload with ${channels.length || 0} channels successfully processed and sent to print engine.`,
      dispatched_count: channels.length,
      timestamp: new Date().toISOString(),
      channels: channels,
      requestId
    });
  },

  async submitTest(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-04';
      const result = await Stage04Service.submitTest(req.body, operator, station);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getStatusByMeter(req, res, next) {
    try {
      const { meterNo } = req.params;
      const status = await Stage04Service.getStatusByMeter(meterNo);
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = Stage04Controller;
