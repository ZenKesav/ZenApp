const { query } = require('../../../core/database/connection');

const StageMasterModel = {

  async getStageManagement() {
    return await query.all(`SELECT * FROM production_stages ORDER BY stage_number ASC`);
  },


  async findByStageNumber(stageNumber) {
    return await query.get(`SELECT * FROM production_stages WHERE stage_number = ?`, [stageNumber]);
  },


  async createStage(stageData) {
    const stageNum = Number(stageData.stage_number);
    const existing = await query.get(`SELECT id FROM production_stages WHERE stage_number = ?`, [stageNum]);
    if (existing) {
      throw new Error(`Production Stage #${stageNum} already exists! Please choose another stage number.`);
    }

    const hardwareStation = stageData.hardware_station || `Station-${String(stageNum).padStart(2, '0')}`;
    const status = stageData.status !== undefined
      ? String(stageData.status === true || stageData.status === 'true' || stageData.status === 'ACTIVE' || stageData.status === 1 || stageData.status === '1')
      : 'true';

    const res = await query.run(
      `INSERT INTO production_stages (stage_number, stage_name, description, line_type, hardware_station, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        stageNum,
        stageData.stage_name,
        stageData.description || '',
        stageData.line_type || 'Main Meter Assembly Line',
        hardwareStation,
        status,
        stageData.created_by || 'admin@zenmeter.com'
      ]
    );
    return res.id;
  },


  async updateStage(id, stageData) {
    const currentStage = (await query.get(`SELECT * FROM production_stages WHERE id = ?`, [id])) ||
                         (await query.get(`SELECT * FROM production_stages WHERE stage_number = ?`, [id]));

    if (!currentStage) {
      throw new Error(`Stage not found with ID ${id}`);
    }

    const oldStageNum = Number(currentStage.stage_number);
    const newStageNum = stageData.stage_number !== undefined && stageData.stage_number !== null && stageData.stage_number !== ''
      ? Number(stageData.stage_number)
      : oldStageNum;

    const stageName = stageData.stage_name !== undefined ? stageData.stage_name : currentStage.stage_name;
    const description = stageData.description !== undefined ? stageData.description : currentStage.description;
    const lineType = stageData.line_type !== undefined ? stageData.line_type : currentStage.line_type;
    const status = stageData.status !== undefined
      ? String(stageData.status === true || stageData.status === 'true' || stageData.status === 'ACTIVE' || stageData.status === 1 || stageData.status === '1')
      : currentStage.status;
    const updatedBy = stageData.updated_by || 'admin@zenmeter.com';

    let swapped = false;
    let swappedWithStageName = '';

    if (newStageNum !== oldStageNum) {
      const conflictingStage = await query.get(
        `SELECT * FROM production_stages WHERE stage_number = ? AND id != ?`,
        [newStageNum, currentStage.id]
      );

      if (conflictingStage) {
        swapped = true;
        swappedWithStageName = conflictingStage.stage_name;

        await query.run(
          `UPDATE production_stages SET stage_number = ? WHERE id = ?`,
          [-newStageNum, conflictingStage.id]
        );

        const currentHardwareStation = stageData.hardware_station || `Station-${String(newStageNum).padStart(2, '0')}`;
        await query.run(
          `UPDATE production_stages 
           SET stage_number = ?, stage_name = ?, description = ?, line_type = ?, hardware_station = ?, status = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
           WHERE id = ?`,
          [newStageNum, stageName, description, lineType, currentHardwareStation, status, updatedBy, currentStage.id]
        );

        const conflictingHardwareStation = `Station-${String(oldStageNum).padStart(2, '0')}`;
        await query.run(
          `UPDATE production_stages 
           SET stage_number = ?, hardware_station = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
           WHERE id = ?`,
          [oldStageNum, conflictingHardwareStation, updatedBy, conflictingStage.id]
        );
      } else {
        const currentHardwareStation = stageData.hardware_station || `Station-${String(newStageNum).padStart(2, '0')}`;
        await query.run(
          `UPDATE production_stages 
           SET stage_number = ?, stage_name = ?, description = ?, line_type = ?, hardware_station = ?, status = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
           WHERE id = ?`,
          [newStageNum, stageName, description, lineType, currentHardwareStation, status, updatedBy, currentStage.id]
        );
      }
    } else {
      const currentHardwareStation = stageData.hardware_station || currentStage.hardware_station;
      await query.run(
        `UPDATE production_stages 
         SET stage_name = ?, description = ?, line_type = ?, hardware_station = ?, status = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
         WHERE id = ?`,
        [stageName, description, lineType, currentHardwareStation, status, updatedBy, currentStage.id]
      );
    }

    return {
      success: true,
      swapped,
      oldStageNum,
      newStageNum,
      swappedWithStageName
    };
  },


  async deleteStage(id) {
    await query.run(`DELETE FROM production_stages WHERE id = ?`, [id]);
  }

};

module.exports = StageMasterModel;
