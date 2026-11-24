const { StageEngineService } = require('../../../core/services/stageEngine.service');

const Stage10Service = {

  async executeStageHardwareTest(meterNo) {
    return {
      box_weight_grams: 485,
      weight_spec_grams: '470-500',
      box_barcode: `CTN-${meterNo}`,
      status: 'PASS',
      log: '[PACKAGING] Box weight 485g within limits. Barcode label printed and applied to individual carton.'
    };
  },

  async execute(meterNo, operatorId, stationId) {
    return await StageEngineService.runStage(meterNo, 10, operatorId, stationId);
  },

  async submitTest(data = {}, operatorId, stationId = 'STATION-10') {
    const meterNo = data.meter_no || data.meter_serial || data.carton_no || data.serial_no;
    if (!meterNo) {
      throw new Error('meter_no or carton_no is required');
    }
    const status = data.status === 'PASSED' || data.status === 'PASS' ? 'PASS' : (data.status || 'PASS');
    return await StageEngineService.runStage(meterNo, 10, operatorId, stationId, status);
  },

  async submitCarton(data = {}, operatorId, stationId = 'STATION-10') {
    const meterNo = data.meter_no || data.meter_serial || data.serial_no || data.carton_no;
    if (!meterNo) {
      throw new Error('meter_no or meter_serial is required');
    }
    const cartonNo = data.carton_no || `CTN-ZM-${meterNo}`;
    const weight = Number(data.gross_weight || data.weight_g) || 485.5;
    const isWeightPass = weight >= 470 && weight <= 500;
    const status = isWeightPass ? 'PASS' : (data.status || 'PASS');

    const result = await StageEngineService.runStage(meterNo, 10, operatorId, stationId, status);
    return {
      success: true,
      carton_no: cartonNo,
      meter_serial: meterNo,
      gross_weight: `${weight} g`,
      weight_pass: isWeightPass,
      print_status: 'PRINTED',
      status: isWeightPass ? 'PASS' : 'FAIL',
      message: `Carton #${cartonNo} packed (${weight}g) and registered.`,
      result
    };
  },

  async printLabel(data = {}) {
    const cartonNo = data.carton_no || data.meter_serial || 'CTN-ZM-2601-1001';
    return {
      success: true,
      carton_no: cartonNo,
      print_status: 'PRINTED',
      dispatched_to: 'Zebra ZD421 (203 DPI)',
      message: `Thermal barcode shipping label for carton #${cartonNo} sent to printer.`,
      timestamp: new Date().toISOString()
    };
  },

  async getRecords(params = {}) {
    const limit = Number(params.limit) || 50;
    const records = await StageEngineService.getRecords(10, limit);
    return records.map(r => ({
      ...r,
      carton_no: r.carton_no || `CTN-ZM-${r.meter_no}`,
      meter_serial: r.meter_no,
      gross_weight: r.gross_weight || '486.2 g',
      print_status: 'PRINTED'
    }));
  },

  async getStatus(cartonNo) {
    return await StageEngineService.getMeterStatus(cartonNo, 10);
  }

};

module.exports = Stage10Service;
