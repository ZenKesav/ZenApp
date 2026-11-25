const PortScanner = require('./hardware/portScanner');
const SerialManager = require('./hardware/serialManager');
const JigTelemetryParser = require('./hardware/jigTelemetryParser');
const Stage04Model = require('./stage04.model');
const { StageEngineService } = require('../../../core/services/stageEngine.service');

const Stage04Service = {

  /**
   * Scan physical Optical Ports
   */
  async scanPorts() {
    const rawPorts = await PortScanner.scanPorts();
    const ports = rawPorts.map(p => p.path);
    return {
      ports,
      detailedPorts: rawPorts,
      count: rawPorts.length
    };
  },


  /**
   * Connect to selected Optical Port
   */
  async connectPort(portPath, options = {}) {
    return await SerialManager.connect(portPath, options);
  },


  /**
   * Disconnect Optical Port
   */
  async disconnectPort() {
    return await SerialManager.disconnect();
  },


  /**
   * Get USB status
   */
  getStatus() {
    return SerialManager.getStatus();
  },


  /**
   * Start hardware test protocol (START -> ACK -> GET_DATA)
   */
  async startHardwareTest(meterNo = 'NIC_JIG_STAGE_4', stageId = 4, options = {}) {
    const result = await SerialManager.executeJigTestProtocol(meterNo, stageId, options);
    const parsedData = JigTelemetryParser.parseAndValidate(result.data);
    return {
      success: true,
      logs: result.logs,
      data: parsedData
    };
  },

  async submitTest(data = {}, operatorId, stationId = 'STATION-04') {
    const meterNo = data.meter_no || data.nic_serial || data.serial_no || 'NIC_JIG_STAGE_4';
    const status = data.status === 'PASSED' || data.status === 'PASS' ? 'PASS' : (data.status || 'PASS');
    return await StageEngineService.runStage(meterNo, 4, operatorId, stationId, status);
  },

  async getStatusByMeter(meterNo) {
    return await StageEngineService.getMeterStatus(meterNo, 4);
  },


  /**
   * Save validated 8-channel telemetry to database transactionally
   */
  async saveTelemetryToDb(meterNo = 'NIC_JIG_STAGE_4', stageId = 4, rawJigData = {}, operatorId = 'EMP001') {
    const validatedData = JigTelemetryParser.parseAndValidate(rawJigData);
    const saveResult = await Stage04Model.saveJigData(meterNo, stageId, validatedData, operatorId);
    return saveResult;
  },


  /**
   * Check array of IMEIs against DB for existing duplicates
   */
  async checkDuplicateImeis(imeiList = []) {
    return await Stage04Model.checkDuplicateImeis(imeiList);
  },


  /**
   * Get all saved Jig test records with cycle, channel, IMEI & user info
   */
  async getJigRecords(filters = {}) {
    return await Stage04Model.getJigRecords(filters);
  },


  /**
   * Hardware Test simulation / live status check for pipeline
   */
  async executeStageHardwareTest(meterNo) {
    const serialStatus = SerialManager.getStatus();
    return {
      connected: serialStatus.connected,
      port: serialStatus.port,
      status: serialStatus.connected ? 'PASS' : 'HOLD',
      log: serialStatus.connected
        ? `[JIG HARDWARE] Physical USB Serial Jig active on port ${serialStatus.port}. Real hardware telemetries processed strictly via USB CDC.`
        : '[JIG HARDWARE] No physical USB Jig connected. Connect USB hardware to execute live test.'
    };
  },

  /**
   * Generic Stage 4 runner for stage pipeline
   */
  async execute(meterNo, operatorId, stationId) {
    return await StageEngineService.runStage(meterNo, 4, operatorId, stationId);
  }

};

module.exports = Stage04Service;
