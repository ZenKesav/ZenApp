import { request } from '../../../core/api/apiClient';

export const stage02Service = {
  getStatus: (meterNo) => request(`/stages/stage02/${meterNo}`),
  submitTest: (data) => request('/stages/stage02/test', { method: 'POST', body: JSON.stringify(data) }),
  testRf: (data) => request('/stages/stage02/test-rf', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage02/records${query ? `?${query}` : ''}`);
  }
};

export default stage02Service;
