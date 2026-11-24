const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/connection');
const StageInterlockService = require('../../modules/admin/services/stageInterlock.service');
const { broadcast } = require('./socket.service');
const redisClient = require('../cache/redisClient');
const logger = require('../../config/logger.config');

const stageServices = {
  1: () => require('../../modules/stages/stage01-pcb-code-loading/stage01.service'),
  2: () => require('../../modules/stages/stage02-nic-pcb-test/stage02.service'),
  4: () => require('../../modules/stages/stage04-nic-inside-print/stage04.service'),
  6: () => require('../../modules/stages/stage06-calibration/stage06.service'),
  7: () => require('../../modules/stages/stage07-final-validation/stage07.service'),
  8: () => require('../../modules/stages/stage08-pvc-seal-tag/stage08.service'),
  9: () => require('../../modules/stages/stage09-meter-box-print/stage09.service'),
  10: () => require('../../modules/stages/stage10-carton-print/stage10.service'),
  11: () => require('../../modules/stages/stage11-master-carton/stage11.service')
};

const STAGE_NAMES = {
  1: 'PCB Code Loading Test',
  2: 'NIC Card PCB Test',
  3: 'NIC PCB Housing & Soldering',
  4: 'NIC Card Inside Print',
  5: 'Meter Base Assembly',
  6: 'Calibration & Accuracy',
  7: 'Final Functional Validation',
  8: 'PVC Seal (Tag)',
  9: 'Meter Box Body Print',
  10: 'Meter Carton Box Print',
  11: 'Master Box Carton Print'
};

const StageEngineService = {

  async validateStageTransition(meterNo, targetStageId, options = {}) {
    let meter = await query.get(`SELECT * FROM meters WHERE meter_no = ?`, [meterNo]);
    const numStageId = Number(targetStageId);

    if (!meter) {
      const isInitialOrDev = numStageId === 1 || 
                             numStageId === 2 || 
                             numStageId === 4 || 
                             process.env.ENABLE_STAGE_INTERLOCK === 'false' ||
                             options.bypass_interlock;
      if (isInitialOrDev) {
        try {
          await query.run(
            `INSERT INTO meters (meter_no, current_stage, status, created_at, updated_at) VALUES (?, ?, 'IN_PRODUCTION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [meterNo, numStageId]
          );
          meter = await query.get(`SELECT * FROM meters WHERE meter_no = ?`, [meterNo]);
        } catch (_) { }
        return { 
          valid: true, 
          meter: meter || { meter_no: meterNo, current_stage: numStageId, status: 'IN_PRODUCTION' }, 
          stageName: STAGE_NAMES[numStageId] || `Stage ${numStageId}` 
        };
      }
      return { valid: false, reason: `Meter '${meterNo}' does not exist in the database. Enter meter at Stage 1 first.` };
    }

    if (meter.status === 'REJECTED') {
      return { valid: false, reason: `Meter '${meterNo}' is REJECTED and cannot undergo further testing.` };
    }

    let targetStageName = STAGE_NAMES[targetStageId] || `Stage ${targetStageId}`;
    try {
      const stgRow = await query.get(
        `SELECT stage_name, stage_number FROM production_stages WHERE stage_number = ? OR id = ? LIMIT 1`,
        [targetStageId, targetStageId]
      );
      if (stgRow && stgRow.stage_name) {
        targetStageName = `Stage ${String(stgRow.stage_number || targetStageId).padStart(2, '0')}: ${stgRow.stage_name}`;
      }
    } catch (e) { }

    const interlock = await StageInterlockService.validateStageProgression(meterNo, targetStageId, options);
    if (!interlock.allowed) {
      return { valid: false, reason: interlock.message };
    }

    return { valid: true, meter, stageName: targetStageName };
  },


  async runStage(meterNo, stageId, operatorId, stationId = 'STATION-01', overrideStatus = null, options = {}) {
    const numStageId = Number(stageId);
    const validation = await this.validateStageTransition(meterNo, numStageId, options);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Ensure meter exists in meters table
    let meter = await query.get(`SELECT * FROM meters WHERE meter_no = ?`, [meterNo]);
    if (!meter) {
      await query.run(
        `INSERT INTO meters (meter_no, current_stage, status, created_at, updated_at) VALUES (?, 1, 'IN_PRODUCTION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [meterNo]
      );
      meter = await query.get(`SELECT * FROM meters WHERE meter_no = ?`, [meterNo]);
    }

    const sessionId = `TS-${uuidv4().slice(0, 8)}`;
    await query.run(
      `INSERT INTO test_sessions (id, meter_no, stage_id, operator_id, station_id, status) VALUES (?, ?, ?, ?, ?, 'RUNNING')`,
      [sessionId, meterNo, numStageId, operatorId || 'OPERATOR', stationId]
    );

    let hardwareResult = { status: 'PASS', log: `Stage ${numStageId} hardware test completed.` };
    if (stageServices[numStageId]) {
      try {
        const s = stageServices[numStageId]();
        if (typeof s.executeStageHardwareTest === 'function') {
          hardwareResult = await s.executeStageHardwareTest(meterNo);
        }
      } catch (e) {
        logger.warn(`Hardware test execution warning for Stage ${numStageId}:`, e.message);
      }
    }
    if (overrideStatus) {
      hardwareResult.status = overrideStatus;
    }

    const finalStatus = hardwareResult.status || 'PASS';

    await query.run(
      `UPDATE test_sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?`,
      [finalStatus, sessionId]
    );

    const stageName = validation.stageName || STAGE_NAMES[numStageId] || `Stage ${numStageId}`;

    await query.run(
      `INSERT INTO stage_results (test_session_id, meter_no, stage_id, stage_name, status, measurements, hardware_logs, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        meterNo,
        numStageId,
        stageName,
        finalStatus,
        JSON.stringify(hardwareResult),
        hardwareResult.log || '',
        operatorId || 'OPERATOR'
      ]
    );

    let newCurrentStage = meter ? meter.current_stage : numStageId;
    let newMeterStatus = meter ? meter.status : 'IN_PRODUCTION';

    if (finalStatus === 'PASS') {
      newCurrentStage = Math.max(newCurrentStage, numStageId + 1);
      if (newCurrentStage > 11) {
        newMeterStatus = 'PASS';
      } else {
        newMeterStatus = 'IN_PRODUCTION';
      }
    } else if (finalStatus === 'HOLD') {
      newMeterStatus = 'HOLD';
    } else if (finalStatus === 'FAIL') {
      newMeterStatus = 'FAIL';
    }

    await query.run(
      `UPDATE meters SET current_stage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE meter_no = ?`,
      [newCurrentStage, newMeterStatus, meterNo]
    );

    await redisClient.del(`meter:${meterNo}`);

    broadcast('STAGE_RESULT_UPDATED', {
      meter_no: meterNo,
      stage_no: numStageId,
      stage_name: stageName,
      status: finalStatus,
      operator_id: operatorId,
      timestamp: new Date().toISOString()
    });

    broadcast('METER_STATUS_CHANGED', {
      meter_no: meterNo,
      current_stage: newCurrentStage,
      status: newMeterStatus
    });

    return {
      sessionId,
      meterNo,
      stageId: numStageId,
      stageName,
      status: finalStatus,
      measurements: hardwareResult,
      nextStage: newCurrentStage
    };
  },

  async getRecords(stageId, limit = 50) {
    const numStageId = Number(stageId);
    try {
      const rows = await query.all(
        `SELECT id, test_session_id, meter_no, stage_id, stage_name, status, measurements, hardware_logs, operator_id, created_at 
         FROM stage_results 
         WHERE stage_id = ? 
         ORDER BY id DESC LIMIT ?`,
        [numStageId, limit]
      );
      return (rows || []).map(r => {
        let parsed = {};
        try {
          parsed = typeof r.measurements === 'string' ? JSON.parse(r.measurements) : (r.measurements || {});
        } catch (_) { }
        return {
          id: r.id,
          meter_no: r.meter_no,
          stage_id: r.stage_id,
          stage_name: r.stage_name,
          status: r.status,
          operator_id: r.operator_id,
          hardware_logs: r.hardware_logs,
          measurements: parsed,
          created_at: r.created_at,
          time: r.created_at ? new Date(r.created_at).toLocaleTimeString() : '',
          ...parsed
        };
      });
    } catch (err) {
      logger.warn(`Error getting records for stage ${stageId}:`, err.message);
      return [];
    }
  },

  async getMeterStatus(meterNo, stageId) {
    const numStageId = Number(stageId);
    try {
      const meter = await query.get(`SELECT * FROM meters WHERE meter_no = ?`, [meterNo]);
      const lastResult = await query.get(
        `SELECT * FROM stage_results WHERE meter_no = ? AND stage_id = ? ORDER BY id DESC LIMIT 1`,
        [meterNo, numStageId]
      );
      let parsed = {};
      try {
        parsed = typeof lastResult?.measurements === 'string' ? JSON.parse(lastResult.measurements) : (lastResult?.measurements || {});
      } catch (_) { }
      return {
        meter_no: meterNo,
        exists: Boolean(meter),
        current_stage: meter ? meter.current_stage : 1,
        meter_status: meter ? meter.status : 'PENDING',
        stage_id: numStageId,
        stage_status: lastResult ? lastResult.status : 'PENDING',
        measurements: parsed,
        last_tested_at: lastResult?.created_at || null
      };
    } catch (err) {
      logger.warn(`Error getting meter status for ${meterNo} at stage ${stageId}:`, err.message);
      return { meter_no: meterNo, stage_id: numStageId, stage_status: 'PENDING' };
    }
  }

};

StageEngineService.StageEngineService = StageEngineService;
StageEngineService.STAGE_NAMES = STAGE_NAMES;
module.exports = StageEngineService;
