import { request } from '../../../core/api/apiClient';

export const stage11Service = {
  getStatus: (masterNo) => request(`/stages/stage11/${masterNo}`),
  submitMasterBox: (data) => request('/stages/stage11/pack', { method: 'POST', body: JSON.stringify(data) }),
  printShippingLabel: (data) => request('/stages/stage11/print', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage11/records${query ? `?${query}` : ''}`);
  }
};

export default stage11Service;
