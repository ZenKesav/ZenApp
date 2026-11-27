const os = require('os');
const Stage09Service = require('./stage09.service');
const { isRequestFromLocalServer } = require('../../../core/helpers/network.helper');

const Stage09Controller = {
  async checkOpticalCable(req, res, next) {
    try {
      const tunnelId = req.query.tunnel_id || req.query.tunnelId || null;
      const deviceId = req.query.device_id || req.query.deviceId || null;
      const isLocalhost = isRequestFromLocalServer(req);

      // 1. If client tunnelId is provided, check that specific operator laptop tunnel
      if (tunnelId) {
        const result = await Stage09Service.checkOpticalCable({
          tunnelId,
          deviceId,
          isLocalhost,
          allowServerPort: false
        });
        return res.status(200).json({ success: true, isServerMachine: isLocalhost, ...result });
      }

      // If remote client PC and no active tunnel, do NOT expose server COM port as client's device!
      if (!isLocalhost && req.query.allow_server_port !== 'true') {
        return res.status(200).json({
          success: true,
          isServerMachine: false,
          connected: false,
          port: null,
          friendlyName: null,
          baudRate: 9600,
          ports: [],
          source: 'client_disconnected',
          message: 'Client workstation. Optical Cable should be connected to this computer.'
        });
      }

      // 2. Physical server COM port check (only for local server host or explicit server port check)
      const result = await Stage09Service.checkOpticalCable({
        isLocalhost,
        allowServerPort: isLocalhost || req.query.allow_server_port === 'true'
      });
      return res.status(200).json({ success: true, isServerMachine: isLocalhost, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async connectOpticalCable(req, res, next) {
    try {
      const { port, baudRate, dataBits, parity, stopBits, parityErrorChar } = req.body || {};
      const result = await Stage09Service.connectOpticalPort(port, {
        baudRate,
        dataBits,
        parity,
        stopBits,
        parityErrorChar
      });
      return res.status(200).json({ success: Boolean(result.success), ...result });
    } catch (err) {
      return res.status(200).json({
        success: false,
        connected: false,
        message: 'Optical Cable Not Detected: ' + err.message
      });
    }
  },

  async disconnectOpticalCable(req, res, next) {
    try {
      const { port } = req.body || {};
      const result = await Stage09Service.releaseOpticalPort(port);
      return res.status(200).json({ success: true, connected: false, ...result });
    } catch (err) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'Optical cable released: ' + err.message
      });
    }
  },

  async readMeter(req, res, next) {
    try {
      const { port, work_id, stage_id, operator_id, operator_name, user_role, tunnel_id, tunnelId, device_id, deviceId } = req.body || {};
      const effectiveOperator = operator_id || req.user?.employee_id || req.user?.name || 'OPERATOR';
      const effectiveOperatorName = operator_name || req.user?.name || req.user?.user_name || null;
      const effectiveUserRole = user_role || req.user?.role || null;
      const result = await Stage09Service.readMeterData({
        port,
        work_id,
        stage_id,
        operator_id: effectiveOperator,
        operator_name: effectiveOperatorName,
        user_role: effectiveUserRole,
        tunnel_id: tunnel_id || tunnelId,
        device_id: device_id || deviceId
      });
      return res.status(200).json(result);
    } catch (err) {
      if (err.isDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          isAlreadyPrinted: Boolean(err.isAlreadyPrinted),
          existingRecord: err.existingRecord || null,
          message: err.message || 'Duplicate Meter Detected! This meter is already registered.'
        });
      }
      if (err.isValidationError) {
        return res.status(400).json({
          success: false,
          validationError: true,
          missingFields: err.missingFields || [],
          message: err.message
        });
      }
      if (err.isValidationConflict) {
        return res.status(400).json({
          success: false,
          validationConflict: true,
          message: err.message
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async saveMeter(req, res, next) {
    try {
      const {
        work_id,
        work_order,
        stage_id,
        stage_number,
        meter_serial_no,
        meter_no,
        serial_no,
        device_no,
        imei_no,
        nic_sr_no,
        nic_no,
        operator_id,
        operator_name,
        user_role,
        raw_dlms_data
      } = req.body || {};

      const effectiveMeterSerial = meter_serial_no || meter_no || serial_no;
      if (!effectiveMeterSerial) {
        return res.status(400).json({ success: false, message: 'meter_serial_no or meter_no is required' });
      }

      const effectiveNicSr = nic_sr_no || nic_no || null;
      const effectiveWorkId = work_id || work_order || 'WO-STAGE09-001';
      const effectiveStageId = stage_id || stage_number || 9;
      const effectiveOperator = operator_id || req.user?.employee_id || req.user?.name || 'OPERATOR';
      const effectiveOperatorName = operator_name || req.user?.name || req.user?.user_name || null;
      const effectiveUserRole = user_role || req.user?.role || null;

      const result = await Stage09Service.saveMeterRecordToDb({
        work_id: effectiveWorkId,
        stage_id: effectiveStageId,
        meter_serial_no: effectiveMeterSerial,
        device_no,
        imei_no,
        nic_sr_no: effectiveNicSr,
        operator_id: effectiveOperator,
        operator_name: effectiveOperatorName,
        user_role: effectiveUserRole,
        raw_dlms_data
      });

      return res.status(200).json({
        success: true,
        action: result.action,
        isUpdated: result.isUpdated,
        message: result.message || 'Meter data saved successfully.',
        data: result.record || result
      });
    } catch (err) {
      if (err.isDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          isAlreadyPrinted: Boolean(err.isAlreadyPrinted),
          existingRecord: err.existingRecord || null,
          message: err.message || 'Duplicate Meter Detected! This meter is already registered.'
        });
      }
      if (err.isValidationError) {
        return res.status(400).json({
          success: false,
          validationError: true,
          missingFields: err.missingFields || [],
          message: err.message
        });
      }
      if (err.isValidationConflict) {
        return res.status(400).json({
          success: false,
          validationConflict: true,
          message: err.message
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateMeter(req, res, next) {
    try {
      const { id } = req.params;
      const { meter_serial_no, imei_no, nic_sr_no, device_no, operator_id, operator_name, user_role, work_id, stage_id } = req.body || {};
      const result = await Stage09Service.updateMeterRecordInDb(id, {
        meter_serial_no,
        imei_no,
        nic_sr_no,
        device_no,
        operator_id,
        operator_name,
        user_role,
        work_id,
        stage_id
      });
      return res.status(200).json({
        success: true,
        action: 'UPDATED',
        isUpdated: true,
        message: result.message || 'Meter details updated successfully with new value.',
        data: result.record || result
      });
    } catch (err) {
      if (err.isDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          isAlreadyPrinted: Boolean(err.isAlreadyPrinted),
          existingRecord: err.existingRecord || null,
          message: err.message || 'Duplicate Meter Detected! This meter is already registered.'
        });
      }
      if (err.isValidationError) {
        return res.status(400).json({
          success: false,
          validationError: true,
          missingFields: err.missingFields || [],
          message: err.message
        });
      }
      if (err.isValidationConflict) {
        return res.status(400).json({
          success: false,
          validationConflict: true,
          message: err.message
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getRecords(req, res, next) {
    try {
      const workId = req.params.workId || req.query.work_id || null;
      const filters = req.query || {};
      const operatorId = filters.operator_id || req.user?.employee_id || req.user?.id || null;
      const [records, totalCount, workFormProgress] = await Promise.all([
        Stage09Service.getStage09Records(workId, filters),
        Stage09Service.getStage09RecordCount(workId, { ...filters, printed_only: true }),
        workId ? Stage09Service.getWorkFormOperatorProgress(workId, operatorId, null, false, filters.stage_id || null) : Promise.resolve(null)
      ]);
      return res.status(200).json({
        success: true,
        count: records.length,
        total_count: totalCount,
        batch_completed_count: workFormProgress?.batchCompletedCount ?? 0,
        operator_completed_count: workFormProgress?.operatorCompletedCount ?? 0,
        target_quantity: workFormProgress?.targetQuantity ?? null,
        data: records
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getRecordById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await Stage09Service.getStage09RecordById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Meter record not found.' });
      }
      return res.status(200).json({ success: true, data: record });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async checkLaserStatus(req, res, next) {
    try {
      const { deviceId, tunnelId } = req.query || {};
      const isLocalhost = isRequestFromLocalServer(req);

      // If remote client PC and no laser tunnel, do NOT claim server laser COM port
      if (!isLocalhost && !tunnelId && req.query.allow_server_port !== 'true') {
        return res.status(200).json({
          success: true,
          isServerMachine: false,
          connected: false,
          port: null,
          friendlyName: null,
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          ports: [],
          message: 'Client workstation. Laser Port should be connected to this computer.'
        });
      }

      const result = await Stage09Service.checkLaserStatus({ deviceId, tunnelId, isLocalhost });
      return res.status(200).json({ success: true, isServerMachine: isLocalhost, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async connectLaserPort(req, res, next) {
    try {
      const { port, baudRate, dataBits, parity, stopBits, parityErrorChar, deviceId, tunnelId } = req.body || {};
      const clientIp = req.ip || req.connection?.remoteAddress || '';
      const result = await Stage09Service.connectLaserPort(port, {
        baudRate,
        dataBits,
        parity,
        stopBits,
        parityErrorChar
      }, {
        deviceId,
        tunnelId,
        ip: clientIp
      });
      return res.status(200).json({ success: Boolean(result.success), ...result });
    } catch (err) {
      return res.status(200).json({
        success: false,
        connected: false,
        message: 'Laser Port Connection Failed: ' + err.message
      });
    }
  },

  async disconnectLaserPort(req, res, next) {
    try {
      const result = await Stage09Service.disconnectLaserPort();
      return res.status(200).json({ success: true, connected: false, ...result });
    } catch (err) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'Laser machine port released: ' + err.message
      });
    }
  },

  async startLaserSession(req, res, next) {
    try {
      const { meter_serial_no, imei_no, nic_sr_no, port } = req.body || {};
      const result = await Stage09Service.startLaserSession({
        meter_serial_no,
        imei_no,
        nic_sr_no,
        port
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async stopLaserSession(req, res, next) {
    try {
      const result = Stage09Service.stopLaserSession();
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getLaserSessionStatus(req, res, next) {
    try {
      const result = Stage09Service.getLaserSessionStatus();
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async simulateLaserAsk(req, res, next) {
    try {
      const { command } = req.body || {};
      const result = Stage09Service.simulateLaserIncomingQuery(command || 'ALL');
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async printMeter(req, res, next) {
    try {
      const { id, work_id, stage_id, meter_serial_no, imei_no, nic_sr_no, port, laser_port, laser_source, client_webserial, already_transmitted, alreadyTransmitted, operator_id, operator_name, user_role, tunnel_id, tunnelId, device_id, deviceId } = req.body || {};
      const effectiveOperator = operator_id || req.user?.employee_id || req.user?.name || 'OPERATOR';
      const effectiveOperatorName = operator_name || req.user?.name || req.user?.user_name || null;
      const effectiveUserRole = user_role || req.user?.role || null;
      const result = await Stage09Service.executeLaserPrintWithUsbAck({
        id,
        work_id,
        stage_id,
        meter_serial_no,
        imei_no,
        nic_sr_no,
        port: laser_port || port,
        laser_source: laser_source || (client_webserial ? 'client_webserial' : 'server'),
        client_webserial: Boolean(client_webserial),
        alreadyTransmitted: Boolean(alreadyTransmitted || already_transmitted),
        operator_id: effectiveOperator,
        operator_name: effectiveOperatorName,
        user_role: effectiveUserRole,
        tunnel_id: tunnel_id || tunnelId,
        device_id: device_id || deviceId
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async run(req, res, next) {
    try {
      const { meter_no, operator_id, station_id } = req.body || {};
      const result = await Stage09Service.execute(meter_no, operator_id || req.user?.id, station_id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async submitTest(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-09';
      const result = await Stage09Service.submitTest(req.body, operator, station);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getStatus(req, res, next) {
    try {
      const { meterNo } = req.params;
      const status = await Stage09Service.getStatus(meterNo);
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = Stage09Controller;
