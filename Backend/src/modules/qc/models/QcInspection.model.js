const db = require('../../../core/database/connection');
const { query } = db;

const QcInspectionModel = {

  async getQueue() {
    return await query.all(
      `SELECT * FROM meters WHERE current_stage > 11 AND status != 'REJECTED' ORDER BY id ASC`
    );
  },


  async inspect(meterNo, inspectorId, status, remarks = '') {
    const res = await query.run(
      `INSERT INTO qc_inspections (meter_no, inspector_id, status, remarks) VALUES (?, ?, ?, ?)`,
      [meterNo, inspectorId, status, remarks]
    );

    const newMeterStatus = (status === 'PASS' || status === 'PASSED') ? 'PASSED' : 'REJECTED';
    await query.run(
      `UPDATE meters SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE meter_no = ?`,
      [newMeterStatus, meterNo]
    );

    return res.id;
  },


  async getQcTests(filters = {}) {
    const { qc_id, stage_id, assigned_stages, status, search } = filters;
    let client = null;

    if (db.pool) {
      try { client = await db.pool.connect(); } catch (e) { client = null; }
    }

    try {
      if (client) {
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS inspection_data TEXT DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);

        let sql = `SELECT * FROM qc_tests WHERE 1=1`;
        const params = [];
        let pIdx = 1;

        if (qc_id && qc_id !== 'ALL') {
          sql += ` AND qc_id = $${pIdx++}`;
          params.push(String(qc_id));
        }

        if (stage_id && stage_id !== 'ALL' && stage_id !== '') {
          sql += ` AND stage_id = $${pIdx++}`;
          params.push(parseInt(stage_id, 10));
        } else if (assigned_stages && typeof assigned_stages === 'string' && assigned_stages.trim() !== '') {
          const stageArr = assigned_stages.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          if (stageArr.length > 0) {
            sql += ` AND stage_id = ANY($${pIdx++}::int[])`;
            params.push(stageArr);
          }
        }

        if (status && status !== 'ALL' && status !== '') {
          sql += ` AND status = $${pIdx++}`;
          params.push(String(status));
        }

        if (search && search.trim() !== '') {
          const s = `%${search.trim().toLowerCase()}%`;
          sql += ` AND (LOWER(meter_no) LIKE $${pIdx} OR LOWER(serial_no) LIKE $${pIdx} OR LOWER(qc_name) LIKE $${pIdx} OR LOWER(qc_id) LIKE $${pIdx})`;
          params.push(s);
          pIdx++;
        }

        sql += ` ORDER BY id DESC`;

        const res = await client.query(sql, params);
        return res.rows || [];
      } else {
        let sql = `SELECT * FROM qc_tests WHERE 1=1`;
        const params = [];

        if (qc_id && qc_id !== 'ALL') {
          sql += ` AND qc_id = ?`;
          params.push(String(qc_id));
        }

        if (stage_id && stage_id !== 'ALL' && stage_id !== '') {
          sql += ` AND stage_id = ?`;
          params.push(parseInt(stage_id, 10));
        } else if (assigned_stages && typeof assigned_stages === 'string' && assigned_stages.trim() !== '') {
          const stageArr = assigned_stages.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          if (stageArr.length > 0) {
            const placeholders = stageArr.map(() => '?').join(',');
            sql += ` AND stage_id IN (${placeholders})`;
            params.push(...stageArr);
          }
        }

        if (status && status !== 'ALL' && status !== '') {
          sql += ` AND status = ?`;
          params.push(String(status));
        }

        if (search && search.trim() !== '') {
          const s = `%${search.trim().toLowerCase()}%`;
          sql += ` AND (LOWER(meter_no) LIKE ? OR LOWER(serial_no) LIKE ? OR LOWER(qc_name) LIKE ? OR LOWER(qc_id) LIKE ?)`;
          params.push(s, s, s, s);
        }

        sql += ` ORDER BY id DESC`;

        const res = await query.all(sql, params);
        return res || [];
      }
    } catch (err) {
      console.warn('[QcInspectionModel] getQcTests notice:', err.message);
      return [];
    } finally {
      if (client) {
        try { client.release(); } catch (e) { }
      }
    }
  },


  async saveQcTest(data = {}) {
    const {
      qc_id,
      qc_name,
      stage_id,
      stage_name,
      meter_no,
      serial_no,
      batch_no,
      status = 'PASS',
      inspection_data,
      remarks
    } = data;

    if (!qc_id || !stage_id) {
      throw {
        code: 'QC-TEST-001',
        message: 'QC Inspector ID and Stage ID are required.'
      };
    }

    let client = null;
    if (db.pool) {
      try { client = await db.pool.connect(); } catch (e) { client = null; }
    }

    try {
      const inspectionDataStr = typeof inspection_data === 'object' ? JSON.stringify(inspection_data) : (inspection_data || '{}');

      if (client) {
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS inspection_data TEXT DEFAULT NULL;`);
        await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);

        const res = await client.query(
          `INSERT INTO qc_tests (
             qc_id, qc_name, stage_id, stage_name, meter_no, serial_no, batch_no, status, inspection_data, test_details, remarks, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            String(qc_id),
            String(qc_name || qc_id),
            parseInt(stage_id, 10),
            String(stage_name || `Stage ${stage_id}`),
            meter_no ? String(meter_no) : null,
            serial_no ? String(serial_no) : null,
            batch_no ? String(batch_no) : 'BATCH-2026-01',
            String(status),
            inspectionDataStr,
            remarks ? String(remarks) : null
          ]
        );
        return res.rows[0];
      } else {
        const res = await query.run(
          `INSERT INTO qc_tests (
             qc_id, qc_name, stage_id, stage_name, meter_no, serial_no, batch_no, status, inspection_data, remarks
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(qc_id),
            String(qc_name || qc_id),
            parseInt(stage_id, 10),
            String(stage_name || `Stage ${stage_id}`),
            meter_no ? String(meter_no) : null,
            serial_no ? String(serial_no) : null,
            batch_no ? String(batch_no) : 'BATCH-2026-01',
            String(status),
            inspectionDataStr,
            remarks ? String(remarks) : null
          ]
        );
        return { id: res.id, ...data, created_at: new Date().toISOString() };
      }
    } catch (err) {
      console.error('[QcInspectionModel] saveQcTest error:', err.message);
      throw err;
    } finally {
      if (client) {
        try { client.release(); } catch (e) { }
      }
    }
  }

};

module.exports = QcInspectionModel;
