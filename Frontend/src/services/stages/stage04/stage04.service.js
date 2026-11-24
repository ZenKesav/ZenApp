import { request } from '../../../core/api/apiClient';

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

export const stage04Service = {
  ...jigService,
  submitTest: (data) => request('/stages/stage04/test', { method: 'POST', body: JSON.stringify(data) }),
  getStatus: (meterNo) => request(`/stages/stage04/${meterNo}`)
};

export default stage04Service;
