import { request } from '../../core/api/apiClient';

export const supervisorTestService = {
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/supervisor-test${query ? `?${query}` : ''}`);
  },
  saveTest: (data) => request('/supervisor-test', { method: 'POST', body: JSON.stringify(data) })
};

export const operatorService = {
  getAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/operator/analytics${query ? `?${query}` : ''}`);
  }
};

export const supervisorService = {
  ...supervisorTestService,
  ...operatorService,
  requestOverride: (data) => request('/supervisor/override', { method: 'POST', body: JSON.stringify(data) })
};

export default supervisorService;
