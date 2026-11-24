import { apiClient } from '../../core/api/apiClient';

export const permissionService = {
  getPermissions: async () => {
    return await apiClient.get('/permissions');
  }
};

export default permissionService;
