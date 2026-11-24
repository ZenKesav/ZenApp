const AdminService = require('../services/admin.service');

const RoleManagementController = {
  async getRoles(req, res, next) {
    try {
      const roles = await AdminService.getRoles(req.query);
      return res.status(200).json({ success: true, count: roles.length, data: roles, roles });
    } catch (err) {
      next(err);
    }
  },

  async getRoleById(req, res, next) {
    try {
      const role = await AdminService.getRoleById(req.params.id);
      return res.status(200).json({ success: true, data: role });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  },

  async createRole(req, res, next) {
    try {
      const { role_name, name, role_description, description, permissions } = req.body || {};
      const finalRoleName = role_name || name;
      const finalDesc = role_description || description || '';
      const createdBy = req.user?.email || 'admin@zenmeter.com';

      const newRole = await AdminService.createRole(finalRoleName, finalDesc, permissions || [], createdBy);
      return res.status(201).json({ success: true, message: 'Role created successfully', data: newRole });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateRole(req, res, next) {
    try {
      const { role_name, name, role_description, description, permissions, status } = req.body || {};
      const finalRoleName = role_name || name;
      const finalDesc = role_description || description;

      const updated = await AdminService.updateRole(req.params.id, finalRoleName, finalDesc, permissions, status);
      return res.status(200).json({ success: true, message: 'Role updated successfully', data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateRoleStatus(req, res, next) {
    try {
      const { status } = req.body || {};
      await AdminService.updateRoleStatus(req.params.id, status);
      return res.status(200).json({ success: true, message: 'Role status updated successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateRolePermissions(req, res, next) {
    try {
      const { permissions } = req.body || {};
      const updated = await AdminService.updateRolePermissions(req.params.id, permissions || []);
      return res.status(200).json({ success: true, message: 'Role permissions updated successfully', data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteRole(req, res, next) {
    try {
      await AdminService.deleteRole(req.params.id);
      return res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getPermissions(req, res, next) {
    try {
      const permissions = await AdminService.getAllPermissions();
      return res.status(200).json({ success: true, data: permissions });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = RoleManagementController;
