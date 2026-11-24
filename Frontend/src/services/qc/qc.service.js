import { request } from '../../core/api/apiClient';

export const qcService = {
  getQCQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/queue${query ? `?${query}` : ''}`);
  },
  inspectMeter: (data) => request('/qc/inspect', { method: 'POST', body: JSON.stringify(data) }),
  submitInspection: (data) => request('/qc/inspect', { method: 'POST', body: JSON.stringify(data) }),
  getHoldMeters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/hold${query ? `?${query}` : ''}`);
  },
  getRejectedMeters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/rejected${query ? `?${query}` : ''}`);
  },
  getQCReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/reports${query ? `?${query}` : ''}`);
  }
};

export const qcTestService = {
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc-test${query ? `?${query}` : ''}`);
  },
  saveTest: (data) => request('/qc-test', { method: 'POST', body: JSON.stringify(data) })
};

export default {
  ...qcService,
  ...qcTestService
};
