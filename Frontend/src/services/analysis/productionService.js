import { request } from '../../core/api/apiClient';

export const productionService = {
  getOverview: () => request('/production/overview')
};
