export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  QC: 'QC',
  SHIFT_SUPERVISOR: 'SHIFT_SUPERVISOR',
  REPORT_VIEWER: 'REPORT_VIEWER'
};

export const PERMISSIONS = {
  USER_READ: 'USER_READ',
  USER_WRITE: 'USER_WRITE',
  USER_DELETE: 'USER_DELETE',
  ROLE_READ: 'ROLE_READ',
  ROLE_WRITE: 'ROLE_WRITE',
  METER_READ: 'METER_READ',
  METER_WRITE: 'METER_WRITE',
  STAGE_EXECUTE: 'STAGE_EXECUTE',
  QC_INSPECT: 'QC_INSPECT',
  REPORT_READ: 'REPORT_READ',
  AUDIT_READ: 'AUDIT_READ'
};

export const METER_STATUS = {
  IN_PRODUCTION: 'IN_PRODUCTION',
  PASS: 'PASS',
  FAIL: 'FAIL',
  HOLD: 'HOLD',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED'
};

export const STATUS_COLORS = {
  IN_PRODUCTION: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  PASS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAIL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  HOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/40',
  COMPLETED: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
};

export const PRODUCTION_STAGES = [
  { id: 1, code: 'STAGE_01', name: 'Main PCB Code Loading', isManual: false, icon: 'Cpu' },
  { id: 2, code: 'STAGE_02', name: 'NIC PCB Test', isManual: false, icon: 'Wifi' },
  { id: 3, code: 'STAGE_03', name: 'NIC Card Box Assembly', isManual: true, icon: 'Box' },
  { id: 4, code: 'STAGE_04', name: 'NIC Card Inside Print', isManual: false, icon: 'Printer' },
  { id: 5, code: 'STAGE_05', name: 'Meter PCB Box Assembly', isManual: true, icon: 'Package' },
  { id: 6, code: 'STAGE_06', name: 'Calibration & Accuracy Jig', isManual: false, icon: 'Zap' },
  { id: 7, code: 'STAGE_07', name: 'Final Validation Jig', isManual: false, icon: 'CheckCircle2' },
  { id: 8, code: 'STAGE_08', name: 'PVC Seal Tag', isManual: false, icon: 'ShieldCheck' },
  { id: 9, code: 'STAGE_09', name: 'Meter Box Print', isManual: false, icon: 'QrCode' },
  { id: 10, code: 'STAGE_10', name: 'Meter Carton Print', isManual: false, icon: 'Printer' },
  { id: 11, code: 'STAGE_11', name: 'Master Carton Print', isManual: false, icon: 'Layers' }
];

export const STAGES = {
  STAGE_01: { id: 1, code: 'STAGE_01', name: 'Main PCB Code Loading' },
  STAGE_02: { id: 2, code: 'STAGE_02', name: 'NIC PCB Test' },
  STAGE_03: { id: 3, code: 'STAGE_03', name: 'NIC Card Box Assembly' },
  STAGE_04: { id: 4, code: 'STAGE_04', name: 'NIC Inside Print' },
  STAGE_05: { id: 5, code: 'STAGE_05', name: 'Meter PCB Box Assembly' },
  STAGE_06: { id: 6, code: 'STAGE_06', name: 'Calibration & Accuracy Jig' },
  STAGE_07: { id: 7, code: 'STAGE_07', name: 'Final Validation Jig' },
  STAGE_08: { id: 8, code: 'STAGE_08', name: 'PVC Seal Tag' },
  STAGE_09: { id: 9, code: 'STAGE_09', name: 'Meter Box Print' },
  STAGE_10: { id: 10, code: 'STAGE_10', name: 'Meter Carton Print' },
  STAGE_11: { id: 11, code: 'STAGE_11', name: 'Master Carton Print' }
};

export const getStageById = (id) => PRODUCTION_STAGES.find(s => s.id === Number(id));

export default {
  ROLES,
  PERMISSIONS,
  METER_STATUS,
  STATUS_COLORS,
  PRODUCTION_STAGES,
  STAGES,
  getStageById
};
