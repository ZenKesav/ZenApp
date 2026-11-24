import { request } from '../../../core/api/apiClient';

export const stage06Service = {
  getStatus: (meterNo) => request(`/stages/stage06/${meterNo}`),
  submitTest: (data) => request('/stages/stage06/test', { method: 'POST', body: JSON.stringify(data) }),
  startCalibration: (data) => request('/stages/stage06/calibrate', { method: 'POST', body: JSON.stringify(data) }),
  stopCalibration: () => request('/stages/stage06/stop', { method: 'POST' }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage06/records${query ? `?${query}` : ''}`);
  }
};

export default stage06Service;
