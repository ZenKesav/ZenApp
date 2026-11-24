const { query } = require('../../../core/database/connection');

const AssignmentModel = {

  async findByOperator(operatorId) {
    if (operatorId) {
      return await query.all(
        `SELECT * FROM stage_assignments WHERE operator_id = ? AND status = 'ACTIVE' ORDER BY stage_id ASC`,
        [operatorId]
      );
    }
    return await query.all(`SELECT * FROM stage_assignments WHERE status = 'ACTIVE' ORDER BY stage_id ASC`);
  },


  async assignStage(operatorId, stageId, stationId = 'STATION-01') {
    await query.run(`UPDATE stage_assignments SET status = 'INACTIVE' WHERE stage_id = ?`, [stageId]);
    const res = await query.run(
      `INSERT INTO stage_assignments (stage_id, operator_id, station_id, status) VALUES (?, ?, ?, 'ACTIVE')`,
      [stageId, operatorId, stationId]
    );
    return res.id;
  }

};

module.exports = AssignmentModel;
