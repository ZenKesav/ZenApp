import { request } from '../../../core/api/apiClient';

export const stage10Service = {
  getStatus: (cartonNo) => request(`/stages/stage10/${cartonNo}`),
  submitCarton: (data) => request('/stages/stage10/pack', { method: 'POST', body: JSON.stringify(data) }),
  printLabel: (data) => request('/stages/stage10/print', { method: 'POST', body: JSON.stringify(data) }),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/stage10/records${query ? `?${query}` : ''}`);
  }
};

export default stage10Service;
