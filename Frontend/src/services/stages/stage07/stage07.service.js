import { request } from '../../../core/api/apiClient';

export const stage07Service = {
  getStatus: (meterNo) => request(`/stages/stage07/${meterNo}`),
  submitTest: (data) => request('/stages/stage07/test', { method: 'POST', body: JSON.stringify(data) }),
  testRelay: (meterNo, action) => request('/stages/stage07/relay', { method: 'POST', body: JSON.stringify({ meterNo, action }) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage07/records${query ? `?${query}` : ''}`);
  }
};

export default stage07Service;
