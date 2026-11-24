import { request } from '../../core/api/apiClient';

export const qcService = {
  getQCQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/qc/queue${query ? `?${query}` : ''}`);
  },
  inspectMeter: (data) => request('/qc/inspect', { method: 'POST', body: JSON.stringify(data) })
};
