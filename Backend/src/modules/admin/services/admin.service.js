const UserModel = require('../models/User.model');
const RoleModel = require('../models/Role.model');
const ShiftModel = require('../models/Shift.model');
const StageMasterModel = require('../models/StageMaster.model');
const { query } = require('../../../core/database/connection');
const bcrypt = require('bcryptjs');

const getRoleIdByRoleName = (rName) => {
  switch (rName) {
    case 'ADMIN': return 1;
    case 'SUPERVISOR': return 2;
    case 'OPERATOR': return 3;
    case 'QC': return 4;
    case 'REPORT_VIEWER': return 5;
    default: return 3;
  }
};

const getDisplayPassword = (u) => {
  if (!u) return '';
  if (u.raw_password && !u.raw_password.startsWith('$2a$') && !u.raw_password.startsWith('$2b$')) {
    return u.raw_password;
  }
  if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
    return u.password;
  }
  return '••••••••';
};

const isStageActive = (stg) => {
  if (!stg) return false;
  return stg.status === true || stg.status === 'true' || stg.status === 'ACTIVE' || stg.status === 1 || stg.status === '1';
};

const buildUserStageNumbers = (u) => {
  if (!u) return [];
  const set = new Set();
  if (u.assigned_stage) {
    String(u.assigned_stage).split(',').forEach(part => {
      const m = part.trim().match(/^(\d+)/) || part.trim().match(/(\d+)/);
      if (m) {
        const n = Number(m[1]);
        if (!isNaN(n) && n > 0) set.add(n);
      }
    });
  }
  if (u.stage_id) {
    String(u.stage_id).split(',').forEach(s => {
      const n = Number(s.trim());
      if (!isNaN(n) && n > 0) set.add(n);
    });
  }
  return Array.from(set).sort((a, b) => a - b);
};

const normalizeAssignedStages = (data) => {
  if (!data) return {};
  const res = {};
  let stages = null;
  if (data.assigned_stages !== undefined) {
    stages = data.assigned_stages;
  } else if (data.assigned_stage !== undefined) {
    stages = data.assigned_stage;
  } else if (data.stage_id !== undefined) {
    stages = data.stage_id;
  }

  if (stages !== null && stages !== undefined) {
    let stageNumbers = [];
    if (Array.isArray(stages)) {
      stageNumbers = stages
        .map(s => Number(typeof s === 'object' ? (s.stage_number || s.id) : s))
        .filter(n => !isNaN(n) && n > 0);
    } else if (typeof stages === 'string') {
      stages.split(',').forEach(part => {
        const m = part.trim().match(/^(\d+)/) || part.trim().match(/(\d+)/);
        if (m) {
          const n = Number(m[1]);
          if (!isNaN(n) && n > 0) stageNumbers.push(n);
        }
      });
    } else if (typeof stages === 'number') {
      if (!isNaN(stages) && stages > 0) stageNumbers.push(stages);
    }
    stageNumbers = Array.from(new Set(stageNumbers)).sort((a, b) => a - b);
    res.stage_id = stageNumbers.length > 0 ? stageNumbers.join(',') : null;
    if (typeof data.assigned_stage === 'string' && data.assigned_stage.trim()) {
      res.assigned_stage = data.assigned_stage.trim();
    } else if (stageNumbers.length > 0) {
      res.assigned_stage = stageNumbers.map(n => `Stage ${String(n).padStart(2, '0')}`).join(', ');
    } else {
      res.assigned_stage = null;
    }
  }
  return res;
};

const buildUserStagesList = (u, allStages) => {
  if (!u.assigned_stage && !u.stage_id) return [];
  const stageNumSet = new Set();
  if (u.assigned_stage) {
    u.assigned_stage.split(',').forEach(part => {
      const m = part.trim().match(/^(\d+)/);
      if (m) stageNumSet.add(parseInt(m[1], 10));
    });
  }
  if (u.stage_id) {
    String(u.stage_id).split(',').forEach(s => {
      const n = parseInt(s.trim(), 10);
      if (!isNaN(n)) stageNumSet.add(n);
    });
  }
  return (allStages || [])
    .filter(stg => isStageActive(stg) && stageNumSet.has(Number(stg.stage_number)))
    .map(stg => ({
      ...stg,
      assigned_by: u.assigned_by || 'AdminIT (EMP001)',
      assigned_at: u.assigned_at,
      reassigned_by: u.reassigned_by || null,
      reassigned_at: u.reassigned_at || null
    }));
};

const AdminService = {

  // ================= USERS =================
  async getUsers(filters = {}) {
    const rawUsers = await UserModel.findAll(filters);
    const allStages = await StageMasterModel.getStageManagement();

    return rawUsers.map(u => ({
      ...u,
      password: getDisplayPassword(u),
      assigned_stages: buildUserStageNumbers(u),
      assignedStagesList: buildUserStagesList(u, allStages)
    }));
  },


  async getUserById(id) {
    const u = await UserModel.findById(id);
    if (!u) throw new Error('User not found');
    const allStages = await StageMasterModel.getStageManagement();
    return {
      ...u,
      password: getDisplayPassword(u),
      assigned_stages: buildUserStageNumbers(u),
      assignedStagesList: buildUserStagesList(u, allStages)
    };
  },


  async createUser(userData) {
    const existing = await UserModel.findByEmployeeId(userData.employee_id);
    if (existing) {
      throw new Error(`User with Employee ID '${userData.employee_id}' already exists.`);
    }

    const rawPassword = userData.password || userData.raw_password || 'Admin@123';
    const password_hash = await bcrypt.hash(rawPassword, 10);
    const role = (userData.role || 'OPERATOR').toUpperCase();
    const role_id = userData.role_id || getRoleIdByRoleName(role);

    const payload = { ...userData };
    const stageNorm = normalizeAssignedStages(payload);
    delete payload.assigned_stages;
    if (stageNorm.stage_id !== undefined) {
      payload.stage_id = stageNorm.stage_id;
      payload.assigned_stage = stageNorm.assigned_stage;
    }

    const newId = await UserModel.createUser({
      ...payload,
      password_hash,
      raw_password: rawPassword,
      role,
      role_id
    });

    return await this.getUserById(newId);
  },


  async updateUser(id, updateData) {
    const user = await UserModel.findById(id);
    if (!user) throw new Error('User not found');

    const payload = { ...updateData };
    if (payload.password) {
      payload.raw_password = payload.password;
      payload.password_hash = await bcrypt.hash(payload.password, 10);
      delete payload.password;
    }
    if (payload.role) {
      payload.role = payload.role.toUpperCase();
      payload.role_id = payload.role_id || getRoleIdByRoleName(payload.role);
    }

    if (payload.assigned_stages !== undefined || payload.assigned_stage !== undefined) {
      const stageNorm = normalizeAssignedStages(payload);
      delete payload.assigned_stages;
      payload.stage_id = stageNorm.stage_id !== undefined ? stageNorm.stage_id : null;
      payload.assigned_stage = stageNorm.assigned_stage !== undefined ? stageNorm.assigned_stage : null;
      if (!payload.reassigned_at) payload.reassigned_at = new Date();
      if (!payload.reassigned_by && payload.updated_by) payload.reassigned_by = payload.updated_by;
    }

    await UserModel.updateUser(id, payload);
    return await this.getUserById(id);
  },


  async deleteUser(id) {
    const user = await UserModel.findById(id);
    if (!user) throw new Error('User not found');
    await UserModel.deleteUser(id);
  },


  // ================= ROLES =================
  async getRoles(filters = {}) {
    const roles = await RoleModel.findAll(filters);
    const rolePerms = await query.all(`SELECT role_name, permission_code FROM role_permissions`);

    return roles.map(r => {
      const perms = rolePerms
        .filter(rp => (rp.role_name || '').toLowerCase() === (r.role_name || '').toLowerCase())
        .map(rp => rp.permission_code);
      return { ...r, permissions: perms };
    });
  },


  async getRoleById(id) {
    const role = await RoleModel.findById(id) || await RoleModel.findByName(id);
    if (!role) throw new Error('Role not found');
    const rolePerms = await query.all(
      `SELECT permission_code FROM role_permissions WHERE LOWER(role_name) = LOWER(?)`,
      [role.role_name]
    );
    return { ...role, permissions: rolePerms.map(rp => rp.permission_code) };
  },


  async createRole(roleName, roleDescription, permissions = [], createdBy) {
    const existing = await RoleModel.findByName(roleName);
    if (existing) {
      throw new Error(`Role '${roleName}' already exists.`);
    }
    const id = await RoleModel.createRole(roleName, roleDescription, createdBy);
    if (permissions.length > 0) {
      await RoleModel.updatePermissions(roleName, permissions);
    }
    return await this.getRoleById(id);
  },


  async updateRole(id, roleName, roleDescription, permissions = [], status) {
    const existing = await RoleModel.findById(id) || await RoleModel.findByName(id);
    if (!existing) throw new Error('Role not found');
    const finalRoleName = roleName || existing.role_name;
    const finalDesc = roleDescription !== undefined ? roleDescription : existing.role_description;
    await RoleModel.updateRole(existing.id, finalRoleName, finalDesc, status);
    if (finalRoleName && Array.isArray(permissions)) {
      await RoleModel.updatePermissions(finalRoleName, permissions);
    }
    return await this.getRoleById(existing.id);
  },


  async updateRolePermissions(id, permissions = []) {
    const existing = await RoleModel.findById(id) || await RoleModel.findByName(id);
    if (!existing) throw new Error('Role not found');
    await RoleModel.updatePermissions(existing.role_name, permissions);
    return await this.getRoleById(existing.id);
  },


  async updateRoleStatus(id, status) {
    await RoleModel.updateStatus(id, status);
  },


  async deleteRole(id) {
    await RoleModel.deleteRole(id);
  },


  async getAllPermissions() {
    return await query.all(`SELECT * FROM permissions ORDER BY category, code`);
  },


  // ================= SHIFTS =================
  async getShifts() {
    return await ShiftModel.findAll();
  },


  async getShiftById(id) {
    const shift = await ShiftModel.findById(id);
    if (!shift) throw new Error('Shift not found');
    return shift;
  },


  async createShift(payload) {
    const id = await ShiftModel.createShift(payload);
    return await ShiftModel.findById(id);
  },


  async updateShift(id, payload) {
    await ShiftModel.updateShift(id, payload);
    return await ShiftModel.findById(id);
  },


  async updateShiftStatus(id, status) {
    await ShiftModel.updateStatus(id, status);
  },


  async deleteShift(id) {
    await ShiftModel.deleteShift(id);
  },


  // ================= STAGES =================
  async getStages() {
    return await StageMasterModel.getStageManagement();
  },


  async createStage(stageData) {
    const id = await StageMasterModel.createStage(stageData);
    return await StageMasterModel.findByStageNumber(stageData.stage_number) || { id };
  },


  async updateStage(id, stageData) {
    return await StageMasterModel.updateStage(id, stageData);
  },


  async deleteStage(id) {
    await StageMasterModel.deleteStage(id);
  },


  // ================= WORK FORMS =================
  async getWorkForms(filters = {}) {
    return await query.all(`SELECT * FROM stage_work_forms ORDER BY id DESC`);
  },


  async createWorkForm(formData) {
    const res = await query.run(
      `INSERT INTO stage_work_forms (
        form_id, stage_number, stage_name, form_title, batch_no, month_year,
        target_quantity, completed_quantity, description, print_config,
        assigned_operator_id, assigned_operator_name, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        formData.form_id || `WO-${Date.now()}`,
        formData.stage_number,
        formData.stage_name,
        formData.form_title,
        formData.batch_no,
        formData.month_year || null,
        formData.target_quantity || 100,
        formData.completed_quantity || 0,
        formData.description || '',
        formData.print_config ? JSON.stringify(formData.print_config) : null,
        formData.assigned_operator_id || null,
        formData.assigned_operator_name || null,
        formData.created_by || 'Admin'
      ]
    );
    return res.id;
  },


  // ================= SYSTEM SETTINGS =================
  async getSystemSettings() {
    return {
      appName: 'Zenmeter MES Application',
      version: '1.0.0',
      activeLine: 'Main Meter Assembly Line',
      printerStatus: 'ONLINE',
      dbStatus: 'CONNECTED'
    };
  }

};

module.exports = AdminService;
