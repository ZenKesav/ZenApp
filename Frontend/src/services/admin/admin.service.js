import { request } from '../../core/api/apiClient';

export const userService = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/users${query ? `?${query}` : ''}`);
  },
  getUserById: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' })
};

export const roleService = {
  getRoles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/roles${query ? `?${query}` : ''}`);
  },
  createRole: (data) => request('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (idOrName, data) => request(`/roles/${encodeURIComponent(idOrName)}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleRoleStatus: (idOrName, status, updatedBy) =>
    request(`/roles/${encodeURIComponent(idOrName)}/status`, { method: 'PUT', body: JSON.stringify({ status, updated_by: updatedBy }) }),
  updateRolePermissions: (idOrName, permissions, updatedBy) =>
    request(`/roles/${encodeURIComponent(idOrName)}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions, updated_by: updatedBy }) }),
  deleteRole: (idOrName) => request(`/roles/${encodeURIComponent(idOrName)}`, { method: 'DELETE' })
};

export const shiftService = {
  getShifts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/shifts${query ? `?${query}` : ''}`);
  },
  createShift: (data) => request('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id, data) => request(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleShiftStatus: (id, status, updatedBy) =>
    request(`/shifts/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, updated_by: updatedBy }) }),
  deleteShift: (id) => request(`/shifts/${id}`, { method: 'DELETE' })
};

export const stageManagementService = {
  getStages: () => request('/stages/management'),
  createStage: (data) => request('/stages/management', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id, data) => request(`/stages/management/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStage: (id) => request(`/stages/management/${id}`, { method: 'DELETE' }),

  // Stage Work Forms & Work Orders (Work IDs)
  getForms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/management/forms${query ? `?${query}` : ''}`);
  },
  getActiveForm: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stages/management/forms/active${query ? `?${query}` : ''}`);
  },
  createForm: (data) => request('/stages/management/forms', { method: 'POST', body: JSON.stringify(data) }),
  assignForm: (id, data) => request(`/stages/management/forms/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  updateForm: (id, data) => request(`/stages/management/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteForm: (id) => request(`/stages/management/forms/${id}`, { method: 'DELETE' }),
  uploadActualPrintFile: (data) =>
    request('/stages/management/upload-actual-print', { method: 'POST', body: JSON.stringify(data) })
};

export const assignmentService = {
  getAssignments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/assignments${query ? `?${query}` : ''}`);
  },
  assignStage: (data) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  createAssignment: (data) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id) => request(`/assignments/${id}`, { method: 'DELETE' })
};

export const permissionService = {
  getPermissions: () => request('/permissions'),
  updatePermissions: (role, permissions) => request(`/permissions/${role}`, { method: 'PUT', body: JSON.stringify({ permissions }) })
};

export const adminService = {
  ...userService,
  ...roleService,
  ...shiftService,
  ...stageManagementService,
  ...assignmentService,
  ...permissionService
};

export default adminService;
