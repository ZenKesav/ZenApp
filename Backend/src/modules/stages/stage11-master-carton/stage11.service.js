const { StageEngineService } = require('../../../core/services/stageEngine.service');

const Stage11Service = {

  async executeStageHardwareTest(meterNo) {
    return {
      master_carton_id: `MST-${Date.now().toString().slice(-6)}`,
      meters_in_master: 10,
      total_gross_kg: 5.12,
      pallet_tag: 'PALLET-A12',
      status: 'PASS',
      log: '[MASTER PACKAGING] Meter aggregated into Master Box. Shipping pallet manifest generated.'
    };
  },

  async execute(meterNo, operatorId, stationId) {
    return await StageEngineService.runStage(meterNo, 11, operatorId, stationId);
  },

  async submitTest(data = {}, operatorId, stationId = 'STATION-11') {
    const meterNo = data.meter_no || data.master_no || data.serial_no;
    if (!meterNo) {
      throw new Error('meter_no or master_no is required');
    }
    const status = data.status === 'PASSED' || data.status === 'PASS' ? 'PASS' : (data.status || 'PASS');
    return await StageEngineService.runStage(meterNo, 11, operatorId, stationId, status);
  },

  async submitMasterBox(data = {}, operatorId, stationId = 'STATION-11') {
    const masterNo = data.master_no || `MST-ZM-${Date.now().toString().slice(-6)}`;
    const cartons = data.cartons || data.carton_serials || [];
    const cartonCount = data.carton_count || cartons.length || 10;
    const grossWeight = data.gross_weight || '5.32 kg';
    const destination = data.destination || 'BESCOM Zone-2';
    const status = data.status === 'FAIL' ? 'FAIL' : 'PASS';

    const result = await StageEngineService.runStage(masterNo, 11, operatorId, stationId, status);
    return {
      success: true,
      master_no: masterNo,
      carton_count: cartonCount,
      gross_weight: grossWeight,
      destination,
      status: 'DISPATCH_READY',
      message: `Master Carton #${masterNo} packed with ${cartonCount} cartons and registered for shipping.`,
      result
    };
  },

  async printShippingLabel(data = {}) {
    const masterNo = data.master_no || 'MST-ZM-2601-0080';
    return {
      success: true,
      master_no: masterNo,
      print_status: 'PRINTED',
      dispatched_to: 'Zebra ZT411 Industrial Master Shipper (4x6")',
      message: `Industrial Master Shipper 4x6" Pallet Label for #${masterNo} sent to printer.`,
      timestamp: new Date().toISOString()
    };
  },

  async getRecords(params = {}) {
    const limit = Number(params.limit) || 50;
    const records = await StageEngineService.getRecords(11, limit);
    return records.map(r => ({
      ...r,
      master_no: r.master_no || `MST-ZM-${r.meter_no}`,
      carton_count: r.carton_count || 10,
      gross_weight: r.gross_weight || '5.32 kg',
      destination: r.destination || 'BESCOM Zone-2',
      status: r.status === 'PASS' ? 'DISPATCH_READY' : r.status
    }));
  },

  async getStatus(masterNo) {
    return await StageEngineService.getMeterStatus(masterNo, 11);
  }

};

module.exports = Stage11Service;
