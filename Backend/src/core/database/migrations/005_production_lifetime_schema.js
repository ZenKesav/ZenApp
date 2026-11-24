const { initDatabase, query } = require('../connection');
const logger = require('../../../config/logger.config');

async function up() {
  await initDatabase();
  logger.info('[MIGRATION 005] Starting production lifetime schema migration...');

  // 1. Create meter_mapping Table
  await query.exec(`
    CREATE TABLE IF NOT EXISTS meter_mapping (
        id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) UNIQUE,
        pcb_serial_no VARCHAR(100) UNIQUE NOT NULL,
        chip_uid VARCHAR(120),
        nic_serial_no VARCHAR(100) UNIQUE,
        imei_no VARCHAR(30) UNIQUE,
        pvc_seal_left VARCHAR(50) UNIQUE,
        pvc_seal_right VARCHAR(50) UNIQUE,
        carton_barcode VARCHAR(100) UNIQUE,
        master_carton_barcode VARCHAR(100),
        
        stage01_status VARCHAR(20) DEFAULT 'PENDING',
        stage01_completed_at TIMESTAMPTZ,
        stage01_operator_id VARCHAR(50),
        
        stage02_status VARCHAR(20) DEFAULT 'PENDING',
        stage02_completed_at TIMESTAMPTZ,
        stage02_operator_id VARCHAR(50),
        
        stage04_status VARCHAR(20) DEFAULT 'PENDING',
        stage04_completed_at TIMESTAMPTZ,
        stage04_operator_id VARCHAR(50),
        
        stage06_status VARCHAR(20) DEFAULT 'PENDING',
        stage06_completed_at TIMESTAMPTZ,
        stage06_operator_id VARCHAR(50),
        
        stage07_status VARCHAR(20) DEFAULT 'PENDING',
        stage07_completed_at TIMESTAMPTZ,
        stage07_operator_id VARCHAR(50),
        
        stage08_status VARCHAR(20) DEFAULT 'PENDING',
        stage08_completed_at TIMESTAMPTZ,
        stage08_operator_id VARCHAR(50),
        
        stage09_status VARCHAR(20) DEFAULT 'PENDING',
        stage09_completed_at TIMESTAMPTZ,
        stage09_operator_id VARCHAR(50),
        
        stage10_status VARCHAR(20) DEFAULT 'PENDING',
        stage10_completed_at TIMESTAMPTZ,
        stage10_operator_id VARCHAR(50),
        
        stage11_status VARCHAR(20) DEFAULT 'PENDING',
        stage11_completed_at TIMESTAMPTZ,
        stage11_operator_id VARCHAR(50),
        
        current_stage INT DEFAULT 1,
        overall_status VARCHAR(20) DEFAULT 'IN_PROGRESS',
        qc_status VARCHAR(20) DEFAULT 'PENDING',
        supervisor_status VARCHAR(20) DEFAULT 'NONE',
        is_retest BOOLEAN DEFAULT FALSE,
        retest_count INT DEFAULT 0,
        batch_no VARCHAR(50),
        meter_model VARCHAR(50) DEFAULT 'ZEN-1P-10-60A',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_mm_pcb ON meter_mapping(pcb_serial_no);
    CREATE INDEX IF NOT EXISTS idx_mm_serial ON meter_mapping(meter_serial_no);
    CREATE INDEX IF NOT EXISTS idx_mm_nic ON meter_mapping(nic_serial_no);
    CREATE INDEX IF NOT EXISTS idx_mm_imei ON meter_mapping(imei_no);
    CREATE INDEX IF NOT EXISTS idx_mm_carton ON meter_mapping(carton_barcode);
    CREATE INDEX IF NOT EXISTS idx_mm_master ON meter_mapping(master_carton_barcode);
    CREATE INDEX IF NOT EXISTS idx_mm_stage_status ON meter_mapping(current_stage, overall_status);
    CREATE INDEX IF NOT EXISTS idx_mm_created ON meter_mapping(created_at DESC);
  `);
  logger.info('[MIGRATION 005] meter_mapping table and indexes verified.');

  // 2. Safe Migration of existing meters into meter_mapping
  await query.exec(`
    INSERT INTO meter_mapping (
        pcb_serial_no,
        meter_serial_no,
        batch_no,
        meter_model,
        current_stage,
        overall_status,
        created_at,
        updated_at
    )
    SELECT 
        meter_no,
        serial_no,
        batch_no,
        COALESCE(model, 'ZEN-1P-10-60A'),
        COALESCE(current_stage, 1),
        COALESCE(status, 'IN_PROGRESS'),
        COALESCE(created_at, CURRENT_TIMESTAMP),
        COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM meters
    ON CONFLICT (pcb_serial_no) DO UPDATE SET
        meter_serial_no = EXCLUDED.meter_serial_no,
        current_stage = EXCLUDED.current_stage,
        overall_status = EXCLUDED.overall_status,
        batch_no = COALESCE(EXCLUDED.batch_no, meter_mapping.batch_no),
        meter_model = COALESCE(EXCLUDED.meter_model, meter_mapping.meter_model),
        updated_at = CURRENT_TIMESTAMP;
  `);
  logger.info('[MIGRATION 005] Migrated existing meters into meter_mapping successfully.');

  // 3. Create the 9 Stage-Separated Test Tables
  await query.exec(`
    -- STAGE 01
    CREATE TABLE IF NOT EXISTS stage01_pcb_records (
        record_id BIGSERIAL PRIMARY KEY,
        pcb_serial_no VARCHAR(100) NOT NULL,
        chip_uid VARCHAR(120),
        jig_id VARCHAR(50) NOT NULL,
        firmware_version VARCHAR(50),
        flash_checksum VARCHAR(100),
        boot_current_ma NUMERIC(8,2),
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s01_pcb ON stage01_pcb_records(pcb_serial_no, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_s01_jig ON stage01_pcb_records(jig_id, test_status);

    -- STAGE 02
    CREATE TABLE IF NOT EXISTS stage02_nic_records (
        record_id BIGSERIAL PRIMARY KEY,
        nic_serial_no VARCHAR(100) NOT NULL,
        imei_no VARCHAR(30) NOT NULL,
        jig_id VARCHAR(50) NOT NULL,
        channel_no INT DEFAULT 1,
        cycle_code VARCHAR(50),
        rf_signal_rssi NUMERIC(6,2),
        sim_status VARCHAR(20),
        at_response JSONB,
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s02_nic ON stage02_nic_records(nic_serial_no, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_s02_imei ON stage02_nic_records(imei_no);

    -- STAGE 04
    CREATE TABLE IF NOT EXISTS stage04_nic_print_records (
        record_id BIGSERIAL PRIMARY KEY,
        nic_serial_no VARCHAR(100) NOT NULL,
        imei_no VARCHAR(30) NOT NULL,
        laser_machine_id VARCHAR(50) NOT NULL,
        barcode_read_back VARCHAR(100),
        is_print_verified BOOLEAN DEFAULT TRUE,
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s04_nic ON stage04_nic_print_records(nic_serial_no, created_at DESC);

    -- STAGE 06
    CREATE TABLE IF NOT EXISTS stage06_calibration_records (
        record_id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) NOT NULL,
        jig_id VARCHAR(50) NOT NULL,
        bench_rack_slot INT NOT NULL,
        test_voltage NUMERIC(8,2) NOT NULL,
        test_current NUMERIC(8,3) NOT NULL,
        power_factor NUMERIC(4,2) NOT NULL,
        measured_error_pct NUMERIC(6,4) NOT NULL,
        allowed_tolerance_pct NUMERIC(6,4) NOT NULL,
        pulse_count_actual INT,
        pulse_count_ref INT,
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s06_serial ON stage06_calibration_records(meter_serial_no, created_at DESC);

    -- STAGE 07
    CREATE TABLE IF NOT EXISTS stage07_final_validation_records (
        record_id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) NOT NULL,
        jig_id VARCHAR(50) NOT NULL,
        optical_probe_id VARCHAR(50),
        rtc_drift_seconds NUMERIC(6,2),
        relay_disconnect_test VARCHAR(10),
        relay_reconnect_test VARCHAR(10),
        ip_ping_ms INT,
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s07_serial ON stage07_final_validation_records(meter_serial_no, created_at DESC);

    -- STAGE 08
    CREATE TABLE IF NOT EXISTS stage08_pvc_seal_records (
        record_id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) NOT NULL,
        jig_id VARCHAR(50) NOT NULL,
        pvc_seal_left VARCHAR(50) NOT NULL,
        pvc_seal_right VARCHAR(50) NOT NULL,
        is_left_valid BOOLEAN DEFAULT TRUE,
        is_right_valid BOOLEAN DEFAULT TRUE,
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s08_serial ON stage08_pvc_seal_records(meter_serial_no, created_at DESC);

    -- STAGE 09
    CREATE TABLE IF NOT EXISTS stage09_meter_box_records (
        record_id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) NOT NULL,
        laser_machine_id VARCHAR(50) NOT NULL,
        qr_verified VARCHAR(100),
        print_quality_score NUMERIC(4,2),
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s09_serial ON stage09_meter_box_records(meter_serial_no, created_at DESC);

    -- STAGE 10
    CREATE TABLE IF NOT EXISTS stage10_carton_records (
        record_id BIGSERIAL PRIMARY KEY,
        meter_serial_no VARCHAR(100) NOT NULL,
        carton_barcode VARCHAR(100) UNIQUE NOT NULL,
        gross_weight_kg NUMERIC(6,3) NOT NULL,
        weight_min_tolerance NUMERIC(6,3) NOT NULL,
        weight_max_tolerance NUMERIC(6,3) NOT NULL,
        zebra_printer_ip VARCHAR(45),
        test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
        failure_reason TEXT,
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_s10_serial ON stage10_carton_records(meter_serial_no, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_s10_carton ON stage10_carton_records(carton_barcode);

    -- STAGE 11
    CREATE TABLE IF NOT EXISTS stage11_master_carton_records (
        record_id BIGSERIAL PRIMARY KEY,
        master_carton_barcode VARCHAR(100) NOT NULL,
        carton_barcode VARCHAR(100) NOT NULL,
        meter_serial_no VARCHAR(100) NOT NULL,
        item_position_in_box INT NOT NULL,
        box_total_capacity INT NOT NULL DEFAULT 24,
        pallet_total_weight_kg NUMERIC(8,3),
        is_box_closed BOOLEAN DEFAULT FALSE,
        zebra_master_printer_ip VARCHAR(45),
        operator_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_master_slot UNIQUE (master_carton_barcode, item_position_in_box)
    );
    CREATE INDEX IF NOT EXISTS idx_s11_master ON stage11_master_carton_records(master_carton_barcode);
    CREATE INDEX IF NOT EXISTS idx_s11_serial ON stage11_master_carton_records(meter_serial_no);
  `);
  logger.info('[MIGRATION 005] 9 stage-separated test tables created.');

  // 4. Safe sync of stage09_meter_records into stage09_meter_box_records if present
  try {
    await query.exec(`
      INSERT INTO stage09_meter_box_records (
          meter_serial_no,
          laser_machine_id,
          qr_verified,
          test_status,
          operator_id,
          created_at
      )
      SELECT 
          COALESCE(meter_serial_no, serial_no, meter_no),
          COALESCE(laser_machine_id, 'LASER-01'),
          qr_verified,
          COALESCE(status, 'PASS'),
          operator_id,
          COALESCE(created_at, CURRENT_TIMESTAMP)
      FROM stage09_meter_records
      ON CONFLICT DO NOTHING;
    `);
    logger.info('[MIGRATION 005] Existing stage09_meter_records synced.');
  } catch (e) {
    logger.warn('[MIGRATION 005] Note on stage09 sync: ' + e.message);
  }

  // 5. Create bi-directional synchronization trigger for legacy API backward compatibility
  await query.exec(`
    CREATE OR REPLACE FUNCTION sync_meters_to_mapping()
    RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO meter_mapping (
            pcb_serial_no,
            meter_serial_no,
            current_stage,
            overall_status,
            batch_no,
            meter_model,
            created_at,
            updated_at
        )
        VALUES (
            NEW.meter_no,
            NEW.serial_no,
            COALESCE(NEW.current_stage, 1),
            COALESCE(NEW.status, 'IN_PROGRESS'),
            NEW.batch_no,
            COALESCE(NEW.model, 'ZEN-1P-10-60A'),
            COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
            COALESCE(NEW.updated_at, CURRENT_TIMESTAMP)
        )
        ON CONFLICT (pcb_serial_no) DO UPDATE SET
            meter_serial_no = EXCLUDED.meter_serial_no,
            current_stage = EXCLUDED.current_stage,
            overall_status = EXCLUDED.overall_status,
            batch_no = COALESCE(EXCLUDED.batch_no, meter_mapping.batch_no),
            meter_model = COALESCE(EXCLUDED.meter_model, meter_mapping.meter_model),
            updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE 'plpgsql';

    DROP TRIGGER IF EXISTS trg_sync_meters ON meters;
    CREATE TRIGGER trg_sync_meters
    AFTER INSERT OR UPDATE ON meters
    FOR EACH ROW EXECUTE PROCEDURE sync_meters_to_mapping();
  `);
  logger.info('[MIGRATION 005] meters <-> meter_mapping sync trigger created.');

  logger.info('[MIGRATION 005] SUCCESS! Production lifetime schema migration completed.');
  return true;
}

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('[MIGRATION 005 FAILED]', err);
      process.exit(1);
    });
}

module.exports = { up };
