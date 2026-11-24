import { request } from '../../../core/api/apiClient';

export const stage01Service = {
  getStatus: (meterNo) => request(`/stages/stage01/${meterNo}`),
  submitTest: (data) => request('/stages/stage01/test', { method: 'POST', body: JSON.stringify(data) }),
  flashMcu: (data) => request('/stages/stage01/flash', { method: 'POST', body: JSON.stringify(data) }),
  verifyChecksum: (data) => request('/stages/stage01/verify', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage01/records${query ? `?${query}` : ''}`);
  }
};

export default stage01Service;
