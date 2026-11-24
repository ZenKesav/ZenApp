const { Pool, Client } = require('pg');
const dbConfig = require('../../config/db.config');
const logger = require('../../config/logger.config');

let pgPool = null;
let isConnected = false;

function convertPlaceholders(sql) {
  let paramIndex = 1;
  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  if (/insert or ignore into/i.test(sql)) {
    pgSql = pgSql.replace(/insert or ignore into/gi, 'INSERT INTO');
    if (!/on conflict/i.test(pgSql)) {
      pgSql += ' ON CONFLICT DO NOTHING';
    }
  }
  return pgSql;
}

async function ensureDatabaseExists() {
  const targetDb = dbConfig.database || 'Zenmeter';
  const adminConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  };

  const client = new Client(adminConfig);
  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE LOWER(datname) = LOWER($1)`,
      [targetDb]
    );

    if (res.rowCount === 0) {
      logger.info(`PostgreSQL database '${targetDb}' not found. Creating database '${targetDb}'...`);
      await client.query(`CREATE DATABASE "${targetDb}"`);
      logger.info(`[SUCCESS] PostgreSQL Database '${targetDb}' Created Successfully.`);
    }
    await client.end();
  } catch (err) {
    try { await client.end(); } catch (e) { }
    logger.warn(`Could not verify/create database via default 'postgres' db: ${err.message}`);
  }
}

async function initDatabase() {
  await ensureDatabaseExists();

  const targetDb = dbConfig.database || 'Zenmeter';

  try {
    pgPool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: targetDb,
      max: dbConfig.max || 20,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 5000,
    });

    pgPool.on('error', (err) => {
      logger.error('[ERROR] Unexpected PostgreSQL Pool Error:', err);
    });

    const client = await pgPool.connect();
    isConnected = true;
    logger.info(`[SUCCESS] Connected to PostgreSQL Database '${targetDb}' at ${dbConfig.host}:${dbConfig.port} as '${dbConfig.user}'`);

    // Initialize required tables if they do not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_id INT,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        role_description TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_at TIMESTAMP,
        updated_by VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_name VARCHAR(100) NOT NULL,
        permission_code VARCHAR(100) NOT NULL,
        PRIMARY KEY (role_name, permission_code)
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        user_name VARCHAR(100) DEFAULT 'Zenmeter',
        password_hash VARCHAR(255) NOT NULL,
        raw_password VARCHAR(255),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(50),
        gender VARCHAR(20) DEFAULT 'Male',
        role_id INT DEFAULT 1,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        stage_id VARCHAR(100),
        assigned_stage TEXT,
        assigned_by VARCHAR(100),
        assigned_at TIMESTAMP,
        reassigned_by VARCHAR(100),
        reassigned_at TIMESTAMP,
        avatar TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meters (
        id SERIAL PRIMARY KEY,
        meter_no VARCHAR(50) UNIQUE NOT NULL,
        serial_no VARCHAR(100) UNIQUE NOT NULL,
        batch_no VARCHAR(100) NOT NULL,
        model VARCHAR(100) DEFAULT 'ZM-3000-SMART',
        current_stage INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'IN_PRODUCTION',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stage_assignments (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        stage_id INT NOT NULL,
        station_id VARCHAR(50) NOT NULL,
        assigned_by VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'ASSIGNED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_sessions (
        id VARCHAR(100) PRIMARY KEY,
        meter_no VARCHAR(50) NOT NULL,
        stage_id INT NOT NULL,
        operator_id VARCHAR(50) NOT NULL,
        station_id VARCHAR(50) DEFAULT 'STATION-01',
        status VARCHAR(50) DEFAULT 'RUNNING',
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stage_results (
        id SERIAL PRIMARY KEY,
        test_session_id VARCHAR(100) NOT NULL,
        meter_no VARCHAR(50) NOT NULL,
        stage_id INT NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        measurements TEXT,
        hardware_logs TEXT,
        operator_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS qc_inspections (
        id SERIAL PRIMARY KEY,
        meter_no VARCHAR(50) NOT NULL,
        inspector_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        remarks TEXT,
        inspection_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        employee_id VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        shift_name VARCHAR(100) UNIQUE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        duration_hours INT DEFAULT 8,
        shift_type VARCHAR(50) DEFAULT 'Day Shift',
        year VARCHAR(10) DEFAULT '2026',
        month VARCHAR(20) DEFAULT 'ALL',
        week VARCHAR(20) DEFAULT 'ALL',
        shift_date VARCHAR(50),
        tea_break_1_start VARCHAR(20),
        tea_break_1_end VARCHAR(20),
        lunch_start VARCHAR(20),
        lunch_end VARCHAR(20),
        tea_break_2_start VARCHAR(20),
        tea_break_2_end VARCHAR(20),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_at TIMESTAMP,
        updated_by VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS user_attendance_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100),
        name VARCHAR(100),
        attendance_date VARCHAR(20) NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP,
        shift_id INT,
        shift_name VARCHAR(100),
        shift_time VARCHAR(100),
        status VARCHAR(20) DEFAULT 'LOGGED_IN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS production_stages (
        id SERIAL PRIMARY KEY,
        stage_number INT UNIQUE NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        description TEXT,
        line_type VARCHAR(100) DEFAULT 'Main Meter Assembly Line',
        hardware_station VARCHAR(100) DEFAULT 'Station-01',
        status VARCHAR(20) DEFAULT 'true',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_at TIMESTAMP,
        updated_by VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS supervisor_tests (
        id SERIAL PRIMARY KEY,
        supervisor_id VARCHAR(50) NOT NULL,
        supervisor_name VARCHAR(100) NOT NULL,
        stage_id INT NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        meter_no VARCHAR(50),
        serial_no VARCHAR(100),
        batch_no VARCHAR(100),
        status VARCHAR(20) DEFAULT 'PASS',
        test_data TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS qc_tests (
        id SERIAL PRIMARY KEY,
        qc_id VARCHAR(50) NOT NULL,
        qc_name VARCHAR(100) NOT NULL,
        stage_id INT NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        meter_no VARCHAR(50),
        serial_no VARCHAR(100),
        batch_no VARCHAR(100),
        status VARCHAR(20) DEFAULT 'PASS',
        inspection_data TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS stage09_meter_records (
        id SERIAL PRIMARY KEY,
        work_id VARCHAR(50) NOT NULL,
        stage_id INT DEFAULT 9,
        meter_serial_no VARCHAR(100) NOT NULL,
        device_no VARCHAR(100),
        imei_no VARCHAR(100),
        nic_sr_no VARCHAR(100),
        raw_dlms_data JSONB,
        operator_id VARCHAR(50),
        operator_name VARCHAR(100) DEFAULT NULL,
        user_role VARCHAR(50) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'PASS',
        print VARCHAR(50) DEFAULT NULL,
        print_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    return true;
  } catch (err) {
    isConnected = false;
    logger.warn(`[WARNING] PostgreSQL Connection failed: ${err.message}`);
    return false;
  }
}

async function pgQuery(text, params = []) {
  if (!isConnected || !pgPool) return null;
  try {
    return await pgPool.query(text, params);
  } catch (err) {
    logger.error('PostgreSQL Query Error:', err.message);
    throw err;
  }
}

const query = {
  run: async (sql, params = []) => {
    try {
      let pgSql = convertPlaceholders(sql);
      if (!pgSql.toUpperCase().includes('RETURNING') && pgSql.trim().toUpperCase().startsWith('INSERT')) {
        pgSql += ' RETURNING id';
      }
      const res = await pgQuery(pgSql, params);
      const insertedId = res?.rows?.[0]?.cycle_id || res?.rows?.[0]?.id || 0;
      return { id: insertedId, cycle_id: insertedId, changes: res?.rowCount || 0 };
    } catch (err) {
      logger.error('[PostgreSQL Error] query.run failed:', err.message);
      throw err;
    }
  },

  get: async (sql, params = []) => {
    try {
      const pgSql = convertPlaceholders(sql);
      const res = await pgQuery(pgSql, params);
      return res?.rows?.[0] || null;
    } catch (err) {
      logger.error('[PostgreSQL Error] query.get failed:', err.message);
      throw err;
    }
  },

  all: async (sql, params = []) => {
    try {
      const pgSql = convertPlaceholders(sql);
      const res = await pgQuery(pgSql, params);
      return res?.rows || [];
    } catch (err) {
      logger.error('[PostgreSQL Error] query.all failed:', err.message);
      throw err;
    }
  },

  exec: async (sql) => {
    try {
      await pgQuery(sql);
    } catch (err) {
      logger.error('[PostgreSQL Error] query.exec failed:', err.message);
      throw err;
    }
  }
};

module.exports = {
  get pool() { return pgPool; },
  get isConnected() { return isConnected; },
  initDatabase,
  pgQuery,
  query
};
