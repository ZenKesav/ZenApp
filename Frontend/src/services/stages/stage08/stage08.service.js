import { request } from '../../../core/api/apiClient';

export const stage08Service = {
  getStatus: (meterNo) => request(`/stages/stage08/${meterNo}`),
  validatePair: (data) => request('/stages/stage08/validate', { method: 'POST', body: JSON.stringify(data) }),
  submitSeal: (data) => request('/stages/stage08/seal', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage08/records${query ? `?${query}` : ''}`);
  }
};

export default stage08Service;
