import { request } from '../../../core/api/apiClient';

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
  },
  submitTest: (data) => request('/stages/stage09/test', { method: 'POST', body: JSON.stringify(data) }),
  getStatus: (meterNo) => request(`/stages/stage09/${meterNo}`)
};

export default stage09Service;
