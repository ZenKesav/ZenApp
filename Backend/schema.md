-- =============================================================================
-- DATABASE: ZenmeterApplication
-- ENGINE: PostgreSQL 14+ / pgAdmin 4
-- ARCHITECTURE: Enterprise Smart Meter MES High-Concurrency Schema (Production Ready)
-- =============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PART 1: CORE UTILITY FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- =============================================================================
-- PART 2: RBAC & IDENTITY MANAGEMENT (Common Across All Stages)
-- =============================================================================

-- 1. Roles Master Table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(30) UNIQUE NOT NULL,       -- 'ADMIN', 'SUPERVISOR', 'QC_INSPECTOR', etc.
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,                              -- FK attached after users table creation
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,                              -- FK attached after users table creation
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_roles_updated_at 
BEFORE UPDATE ON roles 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,   -- e.g., 'ADMIN001', 'ZMRD004'
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    badge_barcode VARCHAR(100) UNIQUE,          -- Badge scan login on touch Jigs
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_users_emp_code ON users(employee_code);
CREATE INDEX idx_users_badge ON users(badge_barcode);
CREATE INDEX idx_users_role ON users(role_id);

-- Attach foreign keys to roles table for created_by and updated_by
ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE roles ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 3. System Permissions Master Table
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'STAGE_BYPASS', 'QC_RETEST_OVERRIDE'
    module_name VARCHAR(50) NOT NULL,            -- e.g., 'ADMIN', 'SUPERVISOR', 'QC', 'STAGE'
    description TEXT,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_permissions_updated_at 
BEFORE UPDATE ON permissions 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 4. Role Permissions Cross-Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

CREATE TRIGGER trg_role_permissions_updated_at 
BEFORE UPDATE ON role_permissions 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 5. Production Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    shift_id SERIAL PRIMARY KEY,
    shift_code VARCHAR(20) UNIQUE NOT NULL,     -- 'SHIFT_A', 'SHIFT_B', 'SHIFT_C'
    shift_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_overnight BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_shifts_updated_at 
BEFORE UPDATE ON shifts 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 6. User Attendance & Station Clock-In History
CREATE TABLE IF NOT EXISTS user_attendance_history (
    attendance_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    shift_id INT NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out_time TIMESTAMPTZ,
    terminal_ip VARCHAR(45),
    station_jig_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'AUTO_CLOSED')),
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_attendance_updated_at 
BEFORE UPDATE ON user_attendance_history 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_attendance_user_shift ON user_attendance_history(user_id, shift_id, clock_in_time);

-- =============================================================================
-- PART 3: PRODUCTION STAGE CONFIGURATION & OPERATOR ALLOCATION
-- =============================================================================

-- 7. Production Stages Master Table
CREATE TABLE IF NOT EXISTS production_stages (
    stage_id INT PRIMARY KEY,                   -- 1, 2, 4, 6, 7, 8, 9, 10, 11
    stage_code VARCHAR(30) UNIQUE NOT NULL,     -- 'S01_PCB_LOAD', 'S06_CALIBRATION'
    stage_name VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,                -- Interlock progression sequence
    is_mandatory BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_production_stages_updated_at 
BEFORE UPDATE ON production_stages 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 8. Operator Stage & Jig Assignments
CREATE TABLE IF NOT EXISTS stage_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stage_id INT NOT NULL REFERENCES production_stages(stage_id) ON DELETE RESTRICT,
    shift_id INT NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    jig_id VARCHAR(50) NOT NULL,                -- e.g., 'JIG-005', 'CALIB-01'
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_stage_shift_date UNIQUE (user_id, stage_id, shift_id, assigned_date, jig_id)
);

CREATE TRIGGER trg_stage_assignments_updated_at 
BEFORE UPDATE ON stage_assignments 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_stage_assignments_lookup ON stage_assignments(user_id, stage_id, assigned_date, is_active);

-- 9. Stage Work Forms & Dynamic Product Model Rules / Thresholds
CREATE TABLE IF NOT EXISTS stage_work_forms (
    form_id SERIAL PRIMARY KEY,
    stage_id INT NOT NULL REFERENCES production_stages(stage_id) ON DELETE CASCADE,
    meter_model VARCHAR(50) NOT NULL,           -- e.g., 'ZEN-1P-10-60A', 'ZEN-3P-CT'
    firmware_version VARCHAR(50),
    voltage_min NUMERIC(8,2),
    voltage_max NUMERIC(8,2),
    current_min NUMERIC(8,2),
    current_max NUMERIC(8,2),
    tolerance_percentage NUMERIC(6,4),          -- e.g., 0.2000 for Class 0.5S
    rf_rssi_min NUMERIC(6,2),                   -- e.g., -85.00 dBm
    weight_min_kg NUMERIC(6,3),
    weight_max_kg NUMERIC(6,3),
    validation_schema JSONB,                    -- Extensible dynamic JSON for custom specs
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stage_work_form UNIQUE (stage_id, meter_model, firmware_version)
);

CREATE TRIGGER trg_stage_work_forms_updated_at 
BEFORE UPDATE ON stage_work_forms 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- =============================================================================
-- PART 4: THE CORE METER TRACEABILITY & MAPPING TABLE
-- =============================================================================

-- 10. Central Meters Master Table (Binds all identities across stages)
CREATE TABLE IF NOT EXISTS meters (
    meter_id BIGSERIAL PRIMARY KEY,
    pcb_serial_no VARCHAR(100) UNIQUE NOT NULL,   -- True birth barcode scanned at Stage 01
    meter_serial_no VARCHAR(100) UNIQUE,          -- Final laser-marked serial (assigned at Stage 04/09)
    chip_uid VARCHAR(120),                        -- Microcontroller Unique Hardware ID
    nic_serial_no VARCHAR(100) UNIQUE,            -- Scanned at Stage 02
    imei_no VARCHAR(30) UNIQUE,                   -- Scanned at Stage 02 / Stage 04
    imsi_no VARCHAR(30),
    mac_address VARCHAR(30),
    pvc_seal_left VARCHAR(50) UNIQUE,             -- Scanned at Stage 08
    pvc_seal_right VARCHAR(50) UNIQUE,            -- Scanned at Stage 08
    carton_barcode VARCHAR(100) UNIQUE,           -- Scanned at Stage 10
    master_carton_barcode VARCHAR(100),           -- Scanned at Stage 11
    
    current_stage_id INT REFERENCES production_stages(stage_id) ON DELETE SET NULL, -- Nullable so meter inserts succeed prior to stage config
    overall_status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (overall_status IN ('IN_PROGRESS', 'PASSED', 'REJECTED', 'QUARANTINE')),
    is_retest BOOLEAN DEFAULT FALSE,
    retest_count INT DEFAULT 0,
    batch_no VARCHAR(50),
    meter_model VARCHAR(50) NOT NULL,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_meters_updated_at 
BEFORE UPDATE ON meters 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- Fast Sub-2ms B-Tree Indexes for Instant Barcode Scanner Lookups
CREATE INDEX idx_meters_pcb ON meters(pcb_serial_no);
CREATE INDEX idx_meters_serial ON meters(meter_serial_no);
CREATE INDEX idx_meters_nic ON meters(nic_serial_no);
CREATE INDEX idx_meters_imei ON meters(imei_no);
CREATE INDEX idx_meters_pvc_left ON meters(pvc_seal_left);
CREATE INDEX idx_meters_pvc_right ON meters(pvc_seal_right);
CREATE INDEX idx_meters_carton ON meters(carton_barcode);
CREATE INDEX idx_meters_master_carton ON meters(master_carton_barcode);
CREATE INDEX idx_meters_stage_status ON meters(current_stage_id, overall_status);

-- 11. Jig Hardware Test Sessions (Live Station Heartbeats)
CREATE TABLE IF NOT EXISTS test_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    jig_id VARCHAR(50) NOT NULL,
    stage_id INT NOT NULL REFERENCES production_stages(stage_id) ON DELETE CASCADE,
    operator_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    client_ip VARCHAR(45),
    hardware_status JSONB,                       -- e.g., {"scanner": true, "scale": true, "serialPort": "COM3"}
    is_active BOOLEAN DEFAULT TRUE,
    heartbeat_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_test_sessions_updated_at 
BEFORE UPDATE ON test_sessions 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- =============================================================================
-- PART 5: STAGE-WISE ISOLATED TEST TABLES (Direct Jig & Channel Logging)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STAGE 01: MAIN PCB CODE LOADING & CHIP UID VERIFY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage01_pcb_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT REFERENCES meters(meter_id) ON DELETE CASCADE,
    pcb_serial_no VARCHAR(100) NOT NULL,
    chip_uid VARCHAR(120),
    jig_id VARCHAR(50) NOT NULL,
    channel_no INT DEFAULT 1,
    cycle_code VARCHAR(50),
    firmware_version VARCHAR(50) NOT NULL,
    flash_checksum VARCHAR(100),
    boot_current_ma NUMERIC(8,2),
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    -- Operator ID can be NULL for automated PLC/headless Jigs
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage01_updated_at 
BEFORE UPDATE ON stage01_pcb_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s01_pcb_serial ON stage01_pcb_records(pcb_serial_no);
CREATE INDEX idx_s01_meter_id ON stage01_pcb_records(meter_id);
CREATE INDEX idx_s01_meter_latest ON stage01_pcb_records(meter_id, record_id DESC);
CREATE INDEX idx_s01_jig_status ON stage01_pcb_records(jig_id, test_status, created_at DESC);

-- -----------------------------------------------------------------------------
-- STAGE 02: NIC PCB TEST (SIGNAL, MODEM & IMEI CHECK)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage02_nic_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT REFERENCES meters(meter_id) ON DELETE CASCADE,
    nic_serial_no VARCHAR(100) NOT NULL,
    imei_no VARCHAR(30) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    channel_no INT DEFAULT 1,
    cycle_code VARCHAR(50),
    rf_signal_rssi NUMERIC(6,2),
    sim_status VARCHAR(20),
    at_command_response JSONB,
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage02_updated_at 
BEFORE UPDATE ON stage02_nic_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s02_nic_serial ON stage02_nic_records(nic_serial_no);
CREATE INDEX idx_s02_imei ON stage02_nic_records(imei_no);
CREATE INDEX idx_s02_meter_latest ON stage02_nic_records(meter_id, record_id DESC);
CREATE INDEX idx_s02_jig_status ON stage02_nic_records(jig_id, test_status);

-- -----------------------------------------------------------------------------
-- STAGE 04: NIC INSIDE PRINT (MODEM CHECK, IMEI BIND & LASER TRIGGER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage04_nic_print_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT REFERENCES meters(meter_id) ON DELETE CASCADE,
    nic_serial_no VARCHAR(100) NOT NULL,
    imei_no VARCHAR(30) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    laser_machine_id VARCHAR(50) NOT NULL,
    channel_no INT DEFAULT 1,
    cycle_code VARCHAR(50),
    barcode_read_after_print VARCHAR(100),
    is_print_verified BOOLEAN DEFAULT TRUE,
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage04_updated_at 
BEFORE UPDATE ON stage04_nic_print_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s04_nic_imei ON stage04_nic_print_records(nic_serial_no, imei_no);
CREATE INDEX idx_s04_meter_latest ON stage04_nic_print_records(meter_id, record_id DESC);
CREATE INDEX idx_s04_jig ON stage04_nic_print_records(jig_id);

-- -----------------------------------------------------------------------------
-- STAGE 06: CALIBRATION & ACCURACY JIG (HIGH-VOLUME BENCH TEST)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage06_calibration_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    bench_rack_slot INT NOT NULL,
    cycle_code VARCHAR(50),
    
    test_voltage NUMERIC(8,2) NOT NULL,
    test_current NUMERIC(8,3) NOT NULL,
    power_factor NUMERIC(4,2) NOT NULL,
    measured_error_pct NUMERIC(6,4) NOT NULL,
    allowed_tolerance_pct NUMERIC(6,4) NOT NULL,
    pulse_count_actual INT,
    pulse_count_reference INT,
    certificate_pdf_url TEXT,
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage06_updated_at 
BEFORE UPDATE ON stage06_calibration_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s06_meter ON stage06_calibration_records(meter_id);
CREATE INDEX idx_s06_meter_latest ON stage06_calibration_records(meter_id, record_id DESC);
CREATE INDEX idx_s06_serial ON stage06_calibration_records(meter_serial_no);
CREATE INDEX idx_s06_cycle ON stage06_calibration_records(cycle_code);
CREATE INDEX idx_s06_jig_status ON stage06_calibration_records(jig_id, test_status);

-- -----------------------------------------------------------------------------
-- STAGE 07: FINAL FUNCTIONAL VALIDATION (DLMS, RTC & RELAY TESTING)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage07_final_validation_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    channel_no INT DEFAULT 1,
    cycle_code VARCHAR(50),
    optical_probe_id VARCHAR(50),
    rtc_drift_seconds NUMERIC(6,2),
    relay_disconnect_test VARCHAR(10),
    relay_reconnect_test VARCHAR(10),
    ip_ping_response_ms INT,
    firmware_hash_verified BOOLEAN DEFAULT TRUE,
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage07_updated_at 
BEFORE UPDATE ON stage07_final_validation_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s07_meter_latest ON stage07_final_validation_records(meter_id, record_id DESC);
CREATE INDEX idx_s07_serial ON stage07_final_validation_records(meter_serial_no);
CREATE INDEX idx_s07_jig ON stage07_final_validation_records(jig_id);

-- -----------------------------------------------------------------------------
-- STAGE 08: PVC SEAL & QR TAG VALIDATION (DUAL BARCODE SCANNER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage08_pvc_seal_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    pvc_seal_left VARCHAR(50) NOT NULL,
    pvc_seal_right VARCHAR(50) NOT NULL,
    is_left_tag_valid BOOLEAN DEFAULT TRUE,
    is_right_tag_valid BOOLEAN DEFAULT TRUE,
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage08_updated_at 
BEFORE UPDATE ON stage08_pvc_seal_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s08_meter ON stage08_pvc_seal_records(meter_id);
CREATE INDEX idx_s08_meter_latest ON stage08_pvc_seal_records(meter_id, record_id DESC);
CREATE INDEX idx_s08_seals ON stage08_pvc_seal_records(pvc_seal_left, pvc_seal_right);

-- -----------------------------------------------------------------------------
-- STAGE 09: METER BOX FRONT LASER PRINT & OCR READ-BACK
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage09_meter_box_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    laser_machine_id VARCHAR(50) NOT NULL,
    front_plate_qr_verified VARCHAR(100),
    print_quality_score NUMERIC(4,2),
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage09_updated_at 
BEFORE UPDATE ON stage09_meter_box_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s09_serial ON stage09_meter_box_records(meter_serial_no);
CREATE INDEX idx_s09_meter_latest ON stage09_meter_box_records(meter_id, record_id DESC);

-- -----------------------------------------------------------------------------
-- STAGE 10: SINGLE METER CARTON PRINT & DIGITAL WEIGHING SCALE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage10_carton_records (
    record_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    carton_barcode VARCHAR(100) UNIQUE NOT NULL,
    gross_weight_kg NUMERIC(6,3) NOT NULL,
    weight_min_tolerance NUMERIC(6,3) NOT NULL,
    weight_max_tolerance NUMERIC(6,3) NOT NULL,
    zebra_printer_ip VARCHAR(45),
    print_status VARCHAR(20) DEFAULT 'PRINTED',
    test_status VARCHAR(10) NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
    failure_reason TEXT,
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_stage10_updated_at 
BEFORE UPDATE ON stage10_carton_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s10_carton ON stage10_carton_records(carton_barcode);
CREATE INDEX idx_s10_meter ON stage10_carton_records(meter_id);
CREATE INDEX idx_s10_meter_latest ON stage10_carton_records(meter_id, record_id DESC);

-- -----------------------------------------------------------------------------
-- STAGE 11: MASTER CARTON PACKING, PALLET AGGREGATION & PRINT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage11_master_carton_records (
    record_id BIGSERIAL PRIMARY KEY,
    master_carton_barcode VARCHAR(100) NOT NULL,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    carton_barcode VARCHAR(100) NOT NULL,
    jig_id VARCHAR(50) NOT NULL,
    item_position_in_box INT NOT NULL,
    box_total_capacity INT NOT NULL DEFAULT 24,
    pallet_total_weight_kg NUMERIC(8,3),
    is_box_closed BOOLEAN DEFAULT FALSE,
    zebra_master_printer_ip VARCHAR(45),
    
    operator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    qc_status VARCHAR(15) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    supervisor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    supervisor_override_reason TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Packaging Integrity: Prevents double-packing the same meter or slot
    CONSTRAINT uq_master_carton_slot UNIQUE (master_carton_barcode, item_position_in_box),
    CONSTRAINT uq_master_carton_meter UNIQUE (meter_id)
);

CREATE TRIGGER trg_stage11_updated_at 
BEFORE UPDATE ON stage11_master_carton_records 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_s11_master ON stage11_master_carton_records(master_carton_barcode);
CREATE INDEX idx_s11_meter ON stage11_master_carton_records(meter_serial_no);
CREATE INDEX idx_s11_carton ON stage11_master_carton_records(carton_barcode);

-- =============================================================================
-- PART 6: QC INSPECTIONS, SUPERVISOR TESTS & AUDIT TRAIL
-- =============================================================================

-- 12. Unified QC Tests & Inspection Table (Single Table replacing qc_inspections & qc_tests)
CREATE TABLE IF NOT EXISTS qc_tests (
    qc_id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    stage_id INT NOT NULL REFERENCES production_stages(stage_id) ON DELETE RESTRICT,
    inspector_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    inspector_name VARCHAR(120),
    batch_no VARCHAR(100),
    defect_category VARCHAR(50),
    defect_photo_url TEXT,
    aql_lot_no VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PASS' CHECK (status IN ('PASS', 'FAIL', 'HOLD', 'REJECT', 'RELEASE')),
    inspection_data JSONB,                       -- Checklists, dynamic test points, and values
    remarks TEXT,
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_qc_tests_updated_at 
BEFORE UPDATE ON qc_tests 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_qc_tests_meter ON qc_tests(meter_serial_no, stage_id);
CREATE INDEX idx_qc_tests_stage_status ON qc_tests(stage_id, status);
CREATE INDEX idx_qc_tests_inspector ON qc_tests(inspector_id);

-- 13. Supervisor Stage Verification & Overrides (supervisor_tests)
CREATE TABLE IF NOT EXISTS supervisor_tests (
    id BIGSERIAL PRIMARY KEY,
    meter_id BIGINT NOT NULL REFERENCES meters(meter_id) ON DELETE CASCADE,
    meter_serial_no VARCHAR(100) NOT NULL,
    stage_id INT NOT NULL REFERENCES production_stages(stage_id) ON DELETE RESTRICT,
    stage_name VARCHAR(100),
    supervisor_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    supervisor_name VARCHAR(120),
    batch_no VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PASS' CHECK (status IN ('PASS', 'FAIL', 'APPROVED', 'OVERRIDE', 'REJECTED')),
    override_type VARCHAR(50) DEFAULT 'STAGE_VERIFICATION' CHECK (override_type IN ('STAGE_VERIFICATION', 'FORCE_BYPASS', 'RETEST_PERMISSION', 'DEFECT_CLEAR')),
    reason TEXT NOT NULL,
    test_data JSONB,                            -- Dynamic override or test parameter logs
    digital_signature_hash VARCHAR(255),
    
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_supervisor_tests_updated_at 
BEFORE UPDATE ON supervisor_tests 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_supervisor_tests_meter ON supervisor_tests(meter_serial_no);
CREATE INDEX idx_supervisor_tests_stage ON supervisor_tests(stage_id, status);
CREATE INDEX idx_supervisor_tests_supervisor ON supervisor_tests(supervisor_id);

-- 14. Universal Immutable Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id BIGINT,
    performed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    old_data JSONB,
    new_data JSONB,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_audit_logs_updated_at 
BEFORE UPDATE ON audit_logs 
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);

-- =============================================================================
-- PART 7: ONLY DEFAULT ADMIN ROLE & DEFAULT ADMIN USER SEED
-- =============================================================================

-- 1. Insert ONLY Admin Role
INSERT INTO roles (role_id, role_code, role_name, description)
VALUES (
    1,
    'ADMIN',
    'System Administrator',
    'Full system configuration and master control access'
)
ON CONFLICT (role_id) DO NOTHING;

-- 2. Insert ONLY Default Admin User (Password: Admin@1234)
INSERT INTO users (
    user_id,
    employee_code,
    full_name,
    email,
    phone_number,
    password_hash,
    role_id,
    badge_barcode,
    is_active
)
VALUES (
    1,
    'ADMIN001',
    'Zenmeter System Administrator',
    'admin@zenmeter.com',
    '+91-9876543210',
    crypt('Admin@1234', gen_salt('bf', 10)),
    1,
    'BADGE-ADMIN-001',
    TRUE
)
ON CONFLICT (employee_code) DO NOTHING;

-- Set self-reference audit for Admin
UPDATE roles SET created_by = 1, updated_by = 1 WHERE role_id = 1;
UPDATE users SET created_by = 1, updated_by = 1 WHERE user_id = 1;

-- Sync sequences for roles and users
SELECT setval('roles_role_id_seq', (SELECT COALESCE(MAX(role_id), 1) FROM roles));
SELECT setval('users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM users));
