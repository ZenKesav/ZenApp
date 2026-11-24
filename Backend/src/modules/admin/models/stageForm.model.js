const db = require('../../../core/database/connection');
const logger = require('../../../config/logger.config');

const defaultPrintSpecs = {
  logoType: 'zenmeter',
  logoText: 'ZenMeter',
  logoTagline: '',
  brandTitle: '',
  qrValue: '',
  imei: '',
  wanComm: '',
  meterTitle: '',
  voltageCurrent: '',
  accuracyClass: '',
  category: '',
  meterType: '',
  propertyOf: '',
  loaNo: '',
  pulseConstant: '',
  mfgDate: '',
  serialNo: '',
  manufacturer: '',
  bisText: ''
};

const parseFormRow = (row) => {
  if (!row) return null;
  if (row.print_config && typeof row.print_config === 'string') {
    try {
      row.print_config = JSON.parse(row.print_config);
    } catch (e) {
      row.print_config = null;
    }
  }
  return row;
};

let memoryForms = [];

const StageFormModel = {

  async ensureTable() {
    if (!db.isConnected || !db.pool) return;
    try {
      await db.pgQuery(`
        CREATE TABLE IF NOT EXISTS stage_work_forms (
          id SERIAL PRIMARY KEY,
          form_id VARCHAR(50) UNIQUE NOT NULL,
          stage_number INT NOT NULL,
          stage_name VARCHAR(100),
          form_title VARCHAR(150) NOT NULL,
          batch_no VARCHAR(100),
          month_year VARCHAR(50),
          target_quantity INT DEFAULT 100,
          completed_quantity INT DEFAULT 0,
          description TEXT,
          print_config JSONB,
          assigned_operator_id VARCHAR(50),
          assigned_operator_name VARCHAR(100),
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_by VARCHAR(100) NOT NULL,
          assigned_by VARCHAR(100),
          reassigned_by VARCHAR(100),
          updated_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE stage_work_forms ADD COLUMN IF NOT EXISTS print_config JSONB;
        ALTER TABLE stage_work_forms ADD COLUMN IF NOT EXISTS month_year VARCHAR(50);
        ALTER TABLE stage_work_forms ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
      `);
    } catch (err) {
      logger.warn(`Could not ensure stage_work_forms table: ${err.message}`);
    }
  },


  async findByFormId(formId, excludeId = null) {
    if (!formId) return null;
    const cleanId = String(formId).trim().toLowerCase();
    if (db.isConnected && db.pool) {
      try {
        let sql = `SELECT * FROM stage_work_forms WHERE LOWER(TRIM(form_id)) = $1`;
        const params = [cleanId];
        if (excludeId) {
          const isNumeric = !isNaN(Number(excludeId));
          sql += ` AND ${isNumeric ? 'id != $2' : 'LOWER(TRIM(form_id)) != $2'}`;
          params.push(isNumeric ? Number(excludeId) : cleanId);
        }
        sql += ` LIMIT 1`;
        const res = await db.pgQuery(sql, params);
        return res.rows?.[0] ? parseFormRow(res.rows[0]) : null;
      } catch (err) {
        logger.warn(`findByFormId query failed: ${err.message}`);
      }
    }
    return memoryForms.find(f => {
      const match = String(f.form_id || '').trim().toLowerCase() === cleanId;
      if (!match) return false;
      if (excludeId) {
        return String(f.id) !== String(excludeId) && String(f.form_id || '').trim().toLowerCase() !== String(excludeId).trim().toLowerCase();
      }
      return true;
    }) || null;
  },


  async getForms(filters = {}) {
    await this.ensureTable();
    const parsedFilters = typeof filters === 'object' && filters !== null ? filters : { stage_number: filters };
    const { stage_number, operator_id, status } = parsedFilters;

    if (db.isConnected && db.pool) {
      try {
        let sql = `SELECT * FROM stage_work_forms WHERE 1=1`;
        const params = [];
        let pIdx = 1;

        if (stage_number !== undefined && stage_number !== null && stage_number !== '') {
          const sNum = parseInt(stage_number, 10);
          if (sNum === 7 || sNum === 9) {
            sql += ` AND (stage_number = $${pIdx} OR stage_name ILIKE '%Body Print%')`;
            params.push(sNum);
            pIdx++;
          } else {
            sql += ` AND stage_number = $${pIdx++}`;
            params.push(sNum);
          }
        }

        if (operator_id) {
          sql += ` AND assigned_operator_id = $${pIdx++}`;
          params.push(String(operator_id));
        }

        if (status) {
          sql += ` AND status = $${pIdx++}`;
          params.push(String(status));
        }

        sql += ` ORDER BY updated_at DESC, id DESC`;
        const res = await db.pgQuery(sql, params);
        return (res.rows || []).map(parseFormRow);
      } catch (err) {
        logger.warn(`stage_work_forms query failed, using memory fallback: ${err.message}`);
      }
    }

    let list = memoryForms.map(parseFormRow);
    if (stage_number !== undefined && stage_number !== null && stage_number !== '') {
      const sNum = Number(stage_number);
      if (sNum === 7 || sNum === 9) {
        list = list.filter(f => Number(f.stage_number) === 7 || Number(f.stage_number) === 9 || (f.stage_name && f.stage_name.toLowerCase().includes('body print')));
      } else {
        list = list.filter(f => Number(f.stage_number) === sNum);
      }
    }
    if (operator_id) {
      list = list.filter(f => String(f.assigned_operator_id) === String(operator_id));
    }
    if (status) {
      list = list.filter(f => String(f.status).toUpperCase() === String(status).toUpperCase());
    }
    return list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },


  async getActiveForm(stageNumber, operatorId) {
    await this.ensureTable();
    const sNum = Number(stageNumber);

    if (db.isConnected && db.pool) {
      try {
        let sql = `SELECT * FROM stage_work_forms WHERE 1=1`;
        const params = [];
        let pIdx = 1;

        if (sNum === 7 || sNum === 9) {
          sql += ` AND (stage_number = $${pIdx} OR stage_name ILIKE '%Body Print%')`;
          params.push(sNum);
          pIdx++;
        } else {
          sql += ` AND stage_number = $${pIdx++}`;
          params.push(sNum);
        }

        if (operatorId) {
          sql += ` AND assigned_operator_id = $${pIdx++}`;
          params.push(String(operatorId));
        } else {
          sql += ` AND assigned_operator_id IS NOT NULL`;
        }

        sql += ` AND status != 'COMPLETED' AND status != 'DE-ACTIVE' ORDER BY updated_at DESC, id DESC LIMIT 1`;

        const res = await db.pgQuery(sql, params);
        if (res.rows && res.rows.length > 0) return parseFormRow(res.rows[0]);
        return null;
      } catch (err) {
        logger.warn(`getActiveForm query failed, using memory fallback: ${err.message}`);
      }
    }

    const match = memoryForms.find(
      f => (Number(f.stage_number) === sNum || (sNum === 9 && Number(f.stage_number) === 7) || (sNum === 7 && Number(f.stage_number) === 9)) &&
           Boolean(f.assigned_operator_id) && f.status !== 'COMPLETED' && f.status !== 'DE-ACTIVE'
    );
    return match ? parseFormRow(match) : null;
  },


  async createForm(data) {
    await this.ensureTable();
    const sNum = Number(data.stage_number || 1);
    
    let formId = data.form_id ? data.form_id.trim() : null;
    if (!formId) {
      const timestampSuffix = Date.now().toString().slice(-4);
      formId = `WORK-STG${sNum}-${timestampSuffix}`;
    }

    const existing = await this.findByFormId(formId);
    if (existing) {
      throw new Error(`Work ID / Form ID '${formId}' already exists. Please choose a different Work ID.`);
    }

    const creator = data.created_by || 'AdminIT (EMP001)';
    const updater = data.updated_by || creator;

    const payload = {
      form_id: formId,
      stage_number: sNum,
      stage_name: data.stage_name || `Stage ${sNum}`,
      form_title: data.form_title || `Stage ${sNum} Production Form`,
      batch_no: data.batch_no || 'BATCH-2026-01',
      month_year: data.month_year ? String(data.month_year).trim() : null,
      target_quantity: Number(data.target_quantity) || 100,
      completed_quantity: Number(data.completed_quantity) || 0,
      description: data.description || '',
      print_config: data.print_config || null,
      assigned_operator_id: data.assigned_operator_id || null,
      assigned_operator_name: data.assigned_operator_name || null,
      status: data.status || (data.assigned_operator_id ? 'IN_PROGRESS' : 'ACTIVE'),
      created_by: creator,
      assigned_by: data.assigned_by || (data.assigned_operator_id ? creator : null),
      reassigned_by: null,
      updated_by: updater,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (db.isConnected && db.pool) {
      try {
        const res = await db.pgQuery(
          `INSERT INTO stage_work_forms 
           (form_id, stage_number, stage_name, form_title, batch_no, month_year, target_quantity, completed_quantity, description, print_config, assigned_operator_id, assigned_operator_name, status, created_by, assigned_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            payload.form_id, payload.stage_number, payload.stage_name, payload.form_title, payload.batch_no, payload.month_year,
            payload.target_quantity, payload.completed_quantity, payload.description,
            payload.print_config ? JSON.stringify(payload.print_config) : null,
            payload.assigned_operator_id, payload.assigned_operator_name, payload.status, payload.created_by, payload.assigned_by,
            payload.updated_by
          ]
        );
        const createdRow = parseFormRow(res.rows[0]);
        memoryForms.unshift(createdRow);
        return createdRow;
      } catch (err) {
        logger.error(`createForm DB insert failed: ${err.message}`);
        if (err.code === '23505') {
          throw new Error(`Work ID / Form ID '${payload.form_id}' already exists in database.`);
        }
        throw err;
      }
    }

    payload.id = Date.now();
    memoryForms.unshift(payload);
    return payload;
  },


  async updateForm(idOrFormId, updateData = {}) {
    await this.ensureTable();
    const {
      form_id,
      form_title,
      batch_no,
      month_year,
      target_quantity,
      completed_quantity,
      description,
      print_config,
      status,
      assigned_operator_id,
      assigned_operator_name,
      updated_by
    } = updateData;

    if (form_id) {
      const duplicate = await this.findByFormId(form_id, idOrFormId);
      if (duplicate) {
        throw new Error(`Work ID / Form ID '${form_id}' is already used by another work form.`);
      }
    }

    const nowIso = new Date().toISOString();
    const serializedConfig = print_config && typeof print_config === 'object'
      ? JSON.stringify(print_config)
      : (print_config || null);

    const updater = updated_by || 'AdminIT (EMP001)';

    if (db.isConnected && db.pool) {
      try {
        const isNumeric = !isNaN(Number(idOrFormId));
        const res = await db.pgQuery(
          `UPDATE stage_work_forms 
           SET form_title = COALESCE($1, form_title),
               batch_no = COALESCE($2, batch_no),
               month_year = COALESCE($3, month_year),
               target_quantity = COALESCE($4, target_quantity),
               completed_quantity = COALESCE($5, completed_quantity),
               description = COALESCE($6, description),
               print_config = COALESCE($7::jsonb, print_config),
               status = COALESCE($8, status),
               assigned_operator_id = COALESCE($9, assigned_operator_id),
               assigned_operator_name = COALESCE($10, assigned_operator_name),
               updated_by = COALESCE($11, updated_by),
               updated_at = CURRENT_TIMESTAMP
           WHERE ${isNumeric ? 'id = $12' : 'form_id = $12'}
           RETURNING *`,
          [
            form_title !== undefined ? form_title : null,
            batch_no !== undefined ? batch_no : null,
            month_year !== undefined ? month_year : null,
            target_quantity !== undefined ? Number(target_quantity) : null,
            completed_quantity !== undefined ? Number(completed_quantity) : null,
            description !== undefined ? description : null,
            serializedConfig,
            status !== undefined ? status : null,
            assigned_operator_id !== undefined ? assigned_operator_id : null,
            assigned_operator_name !== undefined ? assigned_operator_name : null,
            updater,
            isNumeric ? Number(idOrFormId) : String(idOrFormId)
          ]
        );
        if (res.rows && res.rows.length > 0) {
          const updated = parseFormRow(res.rows[0]);
          const idx = memoryForms.findIndex(f => f.id === updated.id || f.form_id === updated.form_id);
          if (idx >= 0) memoryForms[idx] = updated;
          return updated;
        }
      } catch (err) {
        logger.error(`updateForm DB update failed: ${err.message}`);
        throw err;
      }
    }

    const form = memoryForms.find(f => String(f.id) === String(idOrFormId) || String(f.form_id) === String(idOrFormId));
    if (!form) throw new Error(`Work form not found for '${idOrFormId}'`);

    if (form_title !== undefined) form.form_title = form_title;
    if (batch_no !== undefined) form.batch_no = batch_no;
    if (month_year !== undefined) form.month_year = month_year;
    if (target_quantity !== undefined) form.target_quantity = Number(target_quantity);
    if (completed_quantity !== undefined) form.completed_quantity = Number(completed_quantity);
    if (description !== undefined) form.description = description;
    if (print_config !== undefined) form.print_config = print_config;
    if (status !== undefined) form.status = status;
    if (assigned_operator_id !== undefined) form.assigned_operator_id = assigned_operator_id;
    if (assigned_operator_name !== undefined) form.assigned_operator_name = assigned_operator_name;
    form.updated_by = updater;
    form.updated_at = nowIso;
    return form;
  },


  async assignForm(idOrFormId, assignData) {
    await this.ensureTable();
    const { assigned_operator_id, assigned_operator_name, reassigned_by, status, updated_by } = assignData;

    const newStatus = status || (assigned_operator_id ? 'IN_PROGRESS' : 'ACTIVE');
    const nowIso = new Date().toISOString();
    const updater = updated_by || reassigned_by || 'AdminIT (EMP001)';

    if (db.isConnected && db.pool) {
      try {
        const isNumeric = !isNaN(Number(idOrFormId));
        const res = await db.pgQuery(
          `UPDATE stage_work_forms 
           SET assigned_operator_id = $1, assigned_operator_name = $2, reassigned_by = $3, status = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP
           WHERE ${isNumeric ? 'id = $6' : 'form_id = $6'}
           RETURNING *`,
          [assigned_operator_id, assigned_operator_name, reassigned_by, newStatus, updater, isNumeric ? Number(idOrFormId) : String(idOrFormId)]
        );
        if (res.rows && res.rows.length > 0) {
          const updated = parseFormRow(res.rows[0]);
          const idx = memoryForms.findIndex(f => f.id === updated.id || f.form_id === updated.form_id);
          if (idx >= 0) memoryForms[idx] = updated;
          return updated;
        }
      } catch (err) {
        logger.error(`assignForm DB update failed: ${err.message}`);
        throw err;
      }
    }

    const form = memoryForms.find(f => String(f.id) === String(idOrFormId) || String(f.form_id) === String(idOrFormId));
    if (!form) throw new Error(`Work form not found for '${idOrFormId}'`);

    form.assigned_operator_id = assigned_operator_id;
    form.assigned_operator_name = assigned_operator_name;
    form.reassigned_by = reassigned_by || form.reassigned_by;
    form.updated_by = updater;
    form.status = newStatus;
    form.updated_at = nowIso;
    return form;
  },


  async deleteForm(idOrFormId) {
    await this.ensureTable();
    if (db.isConnected && db.pool) {
      try {
        const isNumeric = !isNaN(Number(idOrFormId));
        await db.pgQuery(
          `DELETE FROM stage_work_forms WHERE ${isNumeric ? 'id = $1' : 'form_id = $1'}`,
          [isNumeric ? Number(idOrFormId) : String(idOrFormId)]
        );
      } catch (err) {
        logger.warn(`deleteForm DB delete failed: ${err.message}`);
      }
    }

    memoryForms = memoryForms.filter(f => String(f.id) !== String(idOrFormId) && String(f.form_id) !== String(idOrFormId));
    return true;
  }

};

module.exports = StageFormModel;
