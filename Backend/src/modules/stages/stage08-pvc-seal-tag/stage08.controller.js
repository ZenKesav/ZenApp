const Stage08Service = require('./stage08.service');

const Stage08Controller = {
  async run(req, res, next) {
    try {
      const { meter_no, operator_id, station_id } = req.body || {};
      const result = await Stage08Service.execute(meter_no, operator_id || req.user?.id, station_id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async submitTest(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-08';
      const result = await Stage08Service.submitTest(req.body, operator, station);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async validatePair(req, res, next) {
    try {
      const result = await Stage08Service.validatePair(req.body);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async submitSeal(req, res, next) {
    try {
      const operator = req.body?.operator_id || req.user?.id || req.user?.employee_id || 1;
      const station = req.body?.station_id || 'STATION-08';
      const result = await Stage08Service.submitSeal(req.body, operator, station);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getRecords(req, res, next) {
    try {
      const records = await Stage08Service.getRecords(req.query);
      return res.status(200).json({ success: true, records, data: records });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getStatus(req, res, next) {
    try {
      const { meterNo } = req.params;
      const status = await Stage08Service.getStatus(meterNo);
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async readMeter(req, res, next) {
    try {
      const Stage09Service = require('../stage09-meter-box-print/stage09.service');
      const {
        port,
        work_id,
        stage_id,
        operator_id,
        operator_name,
        user_role,
        tunnel_id,
        tunnelId,
        device_id,
        deviceId,
        scanned_nic,
        seals
      } = req.body || {};

      const effectiveOperator = operator_id || req.user?.employee_id || req.user?.name || 'OPERATOR-08';
      const effectiveOperatorName = operator_name || req.user?.name || req.user?.user_name || null;
      const effectiveUserRole = user_role || req.user?.role || null;

      // 1. Read meter via optical DLMS probe
      let readResult = null;
      try {
        readResult = await Stage09Service.readMeterData({
          port,
          work_id,
          stage_id: 8,
          operator_id: effectiveOperator,
          operator_name: effectiveOperatorName,
          user_role: effectiveUserRole,
          tunnel_id: tunnel_id || tunnelId,
          device_id: device_id || deviceId
        });
      } catch (readErr) {
        return res.status(200).json({
          success: false,
          matched: false,
          status: 'FAIL',
          db: 'NOT SAVED',
          result: 'FAILED',
          message: readErr.message || 'Error communicating with optical probe.'
        });
      }

      const meterData = readResult?.meterData || {};
      const serialNo = meterData.serialNo || '';
      const imeiNo = meterData.imeiNo || '';
      let meterNic = meterData.nicSrNo || '';
      const uid = readResult?.savedRecord?.uid || meterData.uid || (serialNo ? `UID-${serialNo}` : `UID-${Date.now()}`);

      // 2. If meter did not return NIC SN from optical DLMS, check meter_mapping and prior stage records by serial or IMEI
      if (!meterNic && (serialNo || imeiNo)) {
        try {
          const { query } = require('../../../core/database/connection');
          if (serialNo) {
            const mmSerial = await query.get(
              `SELECT nic_serial_no FROM meter_mapping WHERE (meter_serial_no = ? OR pcb_serial_no = ?) AND nic_serial_no IS NOT NULL AND nic_serial_no <> '' LIMIT 1`,
              [serialNo, serialNo]
            );
            if (mmSerial && mmSerial.nic_serial_no) meterNic = mmSerial.nic_serial_no;
          }
          if (!meterNic && imeiNo) {
            const mmImei = await query.get(
              `SELECT nic_serial_no FROM meter_mapping WHERE imei_no = ? AND nic_serial_no IS NOT NULL AND nic_serial_no <> '' LIMIT 1`,
              [imeiNo]
            );
            if (mmImei && mmImei.nic_serial_no) meterNic = mmImei.nic_serial_no;
          }
          if (!meterNic && imeiNo) {
            const s4 = await query.get(
              `SELECT nic_serial_no FROM stage04_nic_print_records WHERE imei_no = ? AND nic_serial_no IS NOT NULL AND nic_serial_no <> '' ORDER BY id DESC LIMIT 1`,
              [imeiNo]
            );
            if (s4 && s4.nic_serial_no) meterNic = s4.nic_serial_no;
          }
          if (!meterNic && imeiNo) {
            const s2 = await query.get(
              `SELECT nic_serial_no FROM stage02_nic_records WHERE imei_no = ? AND nic_serial_no IS NOT NULL AND nic_serial_no <> '' ORDER BY id DESC LIMIT 1`,
              [imeiNo]
            );
            if (s2 && s2.nic_serial_no) meterNic = s2.nic_serial_no;
          }
          if (meterNic) {
            meterData.nicSrNo = meterNic;
          }
        } catch (_) { }
      }

      // 3. Compare Scanned NIC SN with Meter Read NIC SN
      const effectiveScannedNic = String(scanned_nic || seals?.nicSerialNumber || '').trim();
      const effectiveMeterNic = String(meterNic || '').trim();

      // Check match:
      const isNicMatched = Boolean(
        effectiveScannedNic &&
        effectiveMeterNic &&
        effectiveScannedNic.toLowerCase() === effectiveMeterNic.toLowerCase()
      );

      // 4. If NIC matched:
      if (isNicMatched) {
        const saveRes = await Stage08Service.saveStage08Record({
          meterSerial: serialNo,
          imeiNo,
          nicSerial: effectiveScannedNic,
          chipUid: uid,
          seals: seals || {},
          operatorId: effectiveOperator,
          stationId: 'STATION-08',
          formId: work_id,
          status: 'PASS'
        });

        return res.status(200).json({
          success: true,
          matched: true,
          status: 'PASS',
          db: 'SAVED',
          result: 'All Step Completed',
          completed_quantity: saveRes.completed_quantity,
          meterData: {
            ...meterData,
            serialNo,
            imeiNo,
            nicSrNo: effectiveMeterNic || effectiveScannedNic,
            uid
          },
          savedRecord: { uid, serialNo },
          message: `NIC SN '${effectiveScannedNic}' matched with Meter. Stage 8 saved and meter_mapping updated.`
        });
      }

      // 5. If NIC mismatch or missing:
      const mismatchReason = !effectiveMeterNic
        ? `NIC SN not detected from meter. Scanned NIC is '${effectiveScannedNic}'.`
        : `NIC SN Mismatch! Scanned NIC '${effectiveScannedNic}' does not match Meter NIC '${effectiveMeterNic}'.`;

      return res.status(200).json({
        success: false,
        matched: false,
        status: 'FAIL',
        db: 'NOT SAVED',
        result: 'FAILED',
        meterData: {
          ...meterData,
          serialNo,
          imeiNo,
          nicSrNo: effectiveMeterNic,
          uid
        },
        savedRecord: { uid, serialNo },
        message: mismatchReason
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        matched: false,
        status: 'FAIL',
        db: 'NOT SAVED',
        result: 'FAILED',
        message: err.message || 'Error communicating with optical probe.'
      });
    }
  }
};

module.exports = Stage08Controller;
