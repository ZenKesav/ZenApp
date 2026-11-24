import { request } from '../core/api/apiClient';

export const productionService = {
  getOverview: () => request('/production/overview')
};

export const meterService = {
  getMeters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/meters${query ? `?${query}` : ''}`);
  },
  getMeterByNo: (meterNo) => request(`/meters/${meterNo}`),
  createMeter: (data) => request('/meters', { method: 'POST', body: JSON.stringify(data) })
};

export const stageService = {
  startStageTest: (data) => request('/stages/start', { method: 'POST', body: JSON.stringify(data) })
};

export const assignmentService = {
  getAssignments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/assignments${query ? `?${query}` : ''}`);
  },
  assignStage: (data) => request('/assignments', { method: 'POST', body: JSON.stringify(data) })
};

export const qcService = {
  getQCQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/queue${query ? `?${query}` : ''}`);
  },
  inspectMeter: (data) => request('/qc/inspect', { method: 'POST', body: JSON.stringify(data) })
};

export const reportService = {
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports${query ? `?${query}` : ''}`);
  }
};

export const userService = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/users${query ? `?${query}` : ''}`);
  },
  getUserById: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' })
};

export const roleService = {
  getRoles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/roles${query ? `?${query}` : ''}`);
  },
  createRole: (data) => request('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (idOrName, data) => request(`/roles/${encodeURIComponent(idOrName)}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleRoleStatus: (idOrName, status, updatedBy) =>
    request(`/roles/${encodeURIComponent(idOrName)}/status`, { method: 'PUT', body: JSON.stringify({ status, updated_by: updatedBy }) }),
  updateRolePermissions: (idOrName, permissions, updatedBy) =>
    request(`/roles/${encodeURIComponent(idOrName)}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions, updated_by: updatedBy }) }),
  deleteRole: (idOrName) => request(`/roles/${encodeURIComponent(idOrName)}`, { method: 'DELETE' })
};

export const shiftService = {
  getShifts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/shifts${query ? `?${query}` : ''}`);
  },
  createShift: (data) => request('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id, data) => request(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleShiftStatus: (id, status, updatedBy) =>
    request(`/shifts/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, updated_by: updatedBy }) }),
  deleteShift: (id) => request(`/shifts/${id}`, { method: 'DELETE' })
};

export const stageManagementService = {
  getStages: () => request('/stages/management'),
  createStage: (data) => request('/stages/management', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id, data) => request(`/stages/management/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStage: (id) => request(`/stages/management/${id}`, { method: 'DELETE' }),

  // Stage Work Forms & Work Orders (Work IDs)
  getForms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/management/forms${query ? `?${query}` : ''}`);
  },
  getActiveForm: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/management/forms/active${query ? `?${query}` : ''}`);
  },
  createForm: (data) => request('/stages/management/forms', { method: 'POST', body: JSON.stringify(data) }),
  assignForm: (id, data) => request(`/stages/management/forms/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  updateForm: (id, data) => request(`/stages/management/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteForm: (id) => request(`/stages/management/forms/${id}`, { method: 'DELETE' }),
  uploadActualPrintFile: (data) =>
    request('/stages/management/upload-actual-print', { method: 'POST', body: JSON.stringify(data) })
};

export const operatorService = {
  getAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/operator/analytics${query ? `?${query}` : ''}`);
  }
};

export const jigService = {
  listUsbPorts: () => request('/jig/ports'),
  connectHardware: (data = {}) => request('/jig/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectHardware: (data = {}) => request('/jig/disconnect', { method: 'POST', body: JSON.stringify(data) }),
  getJigStatus: () => request('/jig/status'),
  startHardwareTest: (data = {}) => request('/jig/start', { method: 'POST', body: JSON.stringify(data) }),
  runHardwareTest: (data = {}) => request('/jig/start', { method: 'POST', body: JSON.stringify(data) }),
  saveJigDataToDb: (data) => request('/jig/save', { method: 'POST', body: JSON.stringify(data) }),
  getJigRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/jig/records${query ? `?${query}` : ''}`);
  },
  checkDuplicateImeis: (data = {}) => request('/jig/check-duplicates', { method: 'POST', body: JSON.stringify(data) }),
  sendPrintPayload: (data = {}) => request('/jig/print', { method: 'POST', body: JSON.stringify(data) }),
  resetJigTest: (data = {}) => request('/jig/reset', { method: 'POST', body: JSON.stringify(data) })
};

export const supervisorTestService = {
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/supervisor-test${query ? `?${query}` : ''}`);
  },
  saveTest: (data) => request('/supervisor-test', { method: 'POST', body: JSON.stringify(data) })
};

export const qcTestService = {
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc-test${query ? `?${query}` : ''}`);
  },
  saveTest: (data) => request('/qc-test', { method: 'POST', body: JSON.stringify(data) })
};

export const stage09Service = {
  getOpticalStatus: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage09/optical-status${query ? `?${query}` : ''}`);
  },
  connectOpticalPort: (data = {}) => request('/stages/stage09/optical-connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectOpticalPort: (data = {}) => request('/stages/stage09/optical-disconnect', { method: 'POST', body: JSON.stringify(data) }),
  getLaserStatus: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage09/laser-status${query ? `?${query}` : ''}`);
  },
  connectLaserPort: (data = {}) => request('/stages/stage09/laser-connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectLaserPort: (data = {}) => request('/stages/stage09/laser-disconnect', { method: 'POST', body: JSON.stringify(data) }),
  startLaserSession: (data = {}) => request('/stages/stage09/laser-start', { method: 'POST', body: JSON.stringify(data) }),
  stopLaserSession: (data = {}) => request('/stages/stage09/laser-stop', { method: 'POST', body: JSON.stringify(data) }),
  getLaserSessionStatus: () => request('/stages/stage09/laser-session-status'),
  simulateLaserAsk: (data = {}) => request('/stages/stage09/laser-simulate-ask', { method: 'POST', body: JSON.stringify(data) }),
  readMeter: (data = {}) => request('/stages/stage09/read-meter', { method: 'POST', body: JSON.stringify(data) }),
  saveMeter: (data = {}) => request('/stages/stage09/save-meter', { method: 'POST', body: JSON.stringify(data) }),
  updateMeter: (id, data = {}) => request(`/stages/stage09/record/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  printMeter: (data = {}) => request('/stages/stage09/print-meter', { method: 'POST', body: JSON.stringify(data) }),
  getRecordById: (id) => request(`/stages/stage09/record/${encodeURIComponent(id)}`),
  getAllRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage09/records${query ? `?${query}` : ''}`);
  },
  getRecords: (workId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const qs = query ? `?${query}` : '';
    return workId
      ? request(`/stages/stage09/records/${encodeURIComponent(workId)}${qs}`)
      : request(`/stages/stage09/records${qs}`);
  }
};




