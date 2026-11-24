const AdminService = require('../services/admin.service');

const UserManagementController = {
  async getUsers(req, res, next) {
    try {
      const users = await AdminService.getUsers(req.query);
      return res.status(200).json({ success: true, count: users.length, users, data: users });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const user = await AdminService.getUserById(req.params.id);
      return res.status(200).json({ success: true, user, data: user });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  },

  async createUser(req, res, next) {
    try {
      const newUser = await AdminService.createUser(req.body);
      return res.status(201).json({ success: true, message: 'User created successfully', user: newUser, data: newUser });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateUser(req, res, next) {
    try {
      const updatedUser = await AdminService.updateUser(req.params.id, req.body);
      return res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser, data: updatedUser });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateOwnProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const { name, user_name, avatar } = req.body || {};
      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name;
      if (user_name !== undefined) updatePayload.user_name = user_name;
      if (avatar !== undefined) updatePayload.avatar = avatar;

      const updatedUser = await AdminService.updateUser(req.user.id, updatePayload);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
        data: updatedUser
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteUser(req, res, next) {
    try {
      await AdminService.deleteUser(req.params.id);
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
};

module.exports = UserManagementController;
