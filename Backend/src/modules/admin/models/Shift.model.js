const { query } = require('../../../core/database/connection');

const ShiftModel = {

  async findAll() {
    return await query.all(`SELECT * FROM shifts ORDER BY id ASC`);
  },


  async findById(id) {
    return await query.get(`SELECT * FROM shifts WHERE id = ?`, [id]);
  },


  async createShift(shiftData) {
    const statusVal = (shiftData.status === false || shiftData.status === 'false' || shiftData.status === 'INACTIVE' || shiftData.status === 0 || shiftData.status === '0') ? 'false' : 'true';
    const res = await query.run(
      `INSERT INTO shifts (
        shift_name, start_time, end_time, shift_type, duration_hours,
        year, month, week, shift_date,
        tea_break_1_start, tea_break_1_end,
        lunch_start, lunch_end,
        tea_break_2_start, tea_break_2_end,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shiftData.shift_name,
        shiftData.start_time || '09:00 AM',
        shiftData.end_time || '06:00 PM',
        shiftData.shift_type || 'General Shift',
        shiftData.duration_hours || 9,
        shiftData.year || '2026',
        shiftData.month || 'ALL',
        shiftData.week || 'ALL',
        shiftData.shift_date || null,
        shiftData.tea_break_1_start || null,
        shiftData.tea_break_1_end || null,
        shiftData.lunch_start || null,
        shiftData.lunch_end || null,
        shiftData.tea_break_2_start || null,
        shiftData.tea_break_2_end || null,
        statusVal,
        shiftData.created_by || null
      ]
    );
    return res.id;
  },


  async updateShift(id, updateData) {
    const fields = [];
    const params = [];
    updateData.updated_at = new Date();

    if (updateData.status !== undefined) {
      updateData.status = (updateData.status === true || updateData.status === 'true' || updateData.status === 'ACTIVE' || updateData.status === 1 || updateData.status === '1') ? 'true' : 'false';
    }

    for (const key of Object.keys(updateData)) {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    }
    if (fields.length === 0) return;

    params.push(id);
    await query.run(`UPDATE shifts SET ${fields.join(', ')} WHERE id = ?`, params);
  },


  async updateStatus(id, status) {
    const statusVal = (status === true || status === 'true' || status === 'ACTIVE' || status === 1 || status === '1') ? 'true' : 'false';
    await query.run(`UPDATE shifts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [statusVal, id]);
  },


  async deleteShift(id) {
    await query.run(`DELETE FROM shifts WHERE id = ?`, [id]);
  }

};

module.exports = ShiftModel;
