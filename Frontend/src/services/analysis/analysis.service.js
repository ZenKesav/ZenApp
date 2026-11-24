import { request } from '../../core/api/apiClient';

export const reportService = {
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports${query ? `?${query}` : ''}`);
  }
};

export const productionService = {
  getOverview: () => request('/production/overview')
};

export const meterService = {
  getMeters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/meters${query ? `?${query}` : ''}`);
  },
  getMeterByNo: (meterNo) => request(`/meters/${meterNo}`),
  createMeter: (data) => request('/meters', { method: 'POST', body: JSON.stringify(data) })
};

export const analysisService = {
  ...reportService,
  ...productionService,
  ...meterService,
  getMetrics: () => request('/analysis/metrics')
};

export default analysisService;
