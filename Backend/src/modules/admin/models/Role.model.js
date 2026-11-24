const { query } = require('../../../core/database/connection');

const RoleModel = {

  async findAll({ search, status } = {}) {
    let sql = `SELECT * FROM roles`;
    let params = [];
    let conds = [];
    if (search && search.trim()) {
      conds.push(`(LOWER(role_name) LIKE ? OR LOWER(COALESCE(role_description, '')) LIKE ?)`);
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s);
    }
    if (status && status.trim()) {
      conds.push(`LOWER(status) = LOWER(?)`);
      params.push(status.trim());
    }
    if (conds.length > 0) sql += ` WHERE ` + conds.join(' AND ');
    sql += ` ORDER BY id ASC`;
    return await query.all(sql, params);
  },


  async findById(id) {
    if (id === undefined || id === null) return null;
    if (isNaN(Number(id))) {
      return await this.findByName(String(id));
    }
    return await query.get(`SELECT * FROM roles WHERE id = ?`, [Number(id)]);
  },


  async findByName(roleName) {
    if (!roleName) return null;
    return await query.get(`SELECT * FROM roles WHERE LOWER(role_name) = LOWER(?)`, [String(roleName).trim()]);
  },


  async createRole(roleName, roleDescription, createdBy = 'System Admin') {
    const res = await query.run(
      `INSERT INTO roles (role_name, role_description, status, created_by) VALUES (?, ?, 'ACTIVE', ?)`,
      [roleName, roleDescription, createdBy]
    );
    return res.id;
  },


  async updateRole(id, roleName, roleDescription, status) {
    let target = await this.findById(id);
    if (!target) {
      target = await this.findByName(id);
    }
    if (!target) throw new Error('Role not found');

    const finalRoleName = (roleName !== undefined && roleName !== null && String(roleName).trim() !== '')
      ? String(roleName).trim()
      : target.role_name;

    const finalDesc = (roleDescription !== undefined && roleDescription !== null)
      ? roleDescription
      : target.role_description;

    if (status !== undefined && status !== null) {
      const statusStr = (status === true || status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE';
      await query.run(
        `UPDATE roles SET role_name = ?, role_description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [finalRoleName, finalDesc, statusStr, target.id]
      );
    } else {
      await query.run(
        `UPDATE roles SET role_name = ?, role_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [finalRoleName, finalDesc, target.id]
      );
    }
  },


  async updateStatus(id, status) {
    let target = await this.findById(id);
    if (!target) {
      target = await this.findByName(id);
    }
    if (!target) throw new Error('Role not found');
    const statusStr = (status === true || status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE';
    await query.run(`UPDATE roles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [statusStr, target.id]);
  },


  async updatePermissions(roleName, permissions) {
    await query.run(`DELETE FROM role_permissions WHERE LOWER(role_name) = LOWER(?)`, [roleName]);
    for (const code of permissions) {
      await query.run(
        `INSERT INTO role_permissions (role_name, permission_code) VALUES (?, ?) ON CONFLICT DO NOTHING`,
        [roleName, code]
      );
    }
  },


  async deleteRole(id) {
    await query.run(`DELETE FROM roles WHERE id = ?`, [id]);
  }

};

module.exports = RoleModel;
