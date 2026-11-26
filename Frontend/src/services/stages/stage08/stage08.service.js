import { request } from '../../../core/api/apiClient';

export const stage08Service = {
  getStatus: (meterNo) => request(`/stages/stage08/${meterNo}`),
  validatePair: (data) => request('/stages/stage08/validate', { method: 'POST', body: JSON.stringify(data) }),
  submitSeal: (data) => request('/stages/stage08/seal', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage08/records${query ? `?${query}` : ''}`);
  },
  getOpticalStatus: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage08/optical-status${query ? `?${query}` : ''}`);
  },
  connectOpticalPort: (data = {}) => request('/stages/stage08/optical-connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectOpticalPort: (data = {}) => request('/stages/stage08/optical-disconnect', { method: 'POST', body: JSON.stringify(data) }),
  readMeter: (data = {}) => request('/stages/stage08/read-meter', { method: 'POST', body: JSON.stringify(data) })
};

export default stage08Service;
