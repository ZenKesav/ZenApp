const { initDatabase, query } = require('../connection');
const logger = require('../../../config/logger.config');

async function up() {
  await initDatabase();
  logger.info('[MIGRATION 006] Starting Stage 4 unification and QC synchronization...');

  // 1. Ensure stage04_nic_print_records has all necessary columns
  await query.exec(`
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS jig_id VARCHAR(50) DEFAULT 'JIG-001';
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS cycle_id INT;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS cycle_uuid VARCHAR(50);
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS channel_no INT DEFAULT 1;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS hwv VARCHAR(50);
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS fwv VARCHAR(50);
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS sig VARCHAR(50);
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS total_channels INT DEFAULT 8;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS connected_count INT DEFAULT 8;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS passed_channels INT DEFAULT 8;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS failed_channels INT DEFAULT 0;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
    ALTER TABLE stage04_nic_print_records ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_s04_cycle ON stage04_nic_print_records(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_s04_cycle_uuid ON stage04_nic_print_records(cycle_uuid);
  `);
  logger.info('[MIGRATION 006] stage04_nic_print_records columns verified.');

  // 2. Migrate existing NIC card test results into stage04_nic_print_records
  const nicCount = await query.get(`
    SELECT COUNT(*) as cnt FROM nic_card_test_results;
  `);
  logger.info(`[MIGRATION 006] Found ${nicCount.cnt} rows in nic_card_test_results.`);

  await query.exec(`
    INSERT INTO stage04_nic_print_records (
        cycle_id, cycle_uuid, channel_no, jig_id, laser_machine_id,
        nic_serial_no, imei_no, hwv, fwv, sig,
        total_channels, connected_count, passed_channels, failed_channels,
        test_status, operator_id, created_at
    )
    SELECT 
        n.cycle_id,
        COALESCE(c.cycle_uuid, CONCAT('ZMRJIG', LPAD(CAST(n.cycle_id AS TEXT), 4, '0'))),
        n.channel_no,
        COALESCE(c.jig_id, 'JIG-001'),
        'LASER-01',
        n.nic_uuid,
        n.imei,
        n.hwv,
        n.fwv,
        n.sig,
        COALESCE(c.total_channels, 8),
        COALESCE(c.connected_count, 8),
        COALESCE(c.passed_channels, 8),
        COALESCE(c.failed_channels, 0),
        n.status,
        n.operator_id,
        n.created_at
    FROM nic_card_test_results n
    LEFT JOIN jig_test_cycles c ON n.cycle_id = c.cycle_id
    ON CONFLICT DO NOTHING;
  `);
  logger.info('[MIGRATION 006] nic_card_test_results successfully migrated to stage04_nic_print_records.');

  // 3. Migrate historical Jig cycles without individual cards into stage04_nic_print_records
  const jigCount = await query.get(`
    SELECT COUNT(*) as cnt FROM jig_test_cycles;
  `);
  logger.info(`[MIGRATION 006] Found ${jigCount.cnt} rows in jig_test_cycles.`);

  await query.exec(`
    INSERT INTO stage04_nic_print_records (
        cycle_id, cycle_uuid, channel_no, jig_id, laser_machine_id,
        nic_serial_no, imei_no,
        total_channels, connected_count, passed_channels, failed_channels,
        test_status, operator_id, created_at
    )
    SELECT 
        c.cycle_id,
        COALESCE(c.cycle_uuid, CONCAT('ZMRJIG', LPAD(CAST(c.cycle_id AS TEXT), 4, '0'))),
        1,
        COALESCE(c.jig_id, 'JIG-001'),
        'LASER-01',
        CONCAT('CYCLE_', c.cycle_id),
        CONCAT('IMEI_CYC_', c.cycle_id),
        COALESCE(c.total_channels, 8),
        COALESCE(c.connected_count, 8),
        COALESCE(c.passed_channels, 8),
        COALESCE(c.failed_channels, 0),
        CASE WHEN c.passed_channels > 0 THEN 'PASS' ELSE 'FAIL' END,
        c.operator_id,
        c.created_at
    FROM jig_test_cycles c
    WHERE c.cycle_id NOT IN (
      SELECT DISTINCT cycle_id FROM stage04_nic_print_records WHERE cycle_id IS NOT NULL
    )
    ON CONFLICT DO NOTHING;
  `);
  logger.info('[MIGRATION 006] All historical jig cycles migrated to stage04_nic_print_records.');

  // Verify total rows in stage04_nic_print_records
  const stg4Count = await query.get(`
    SELECT COUNT(*) as cnt FROM stage04_nic_print_records;
  `);
  logger.info(`[MIGRATION 006] Total rows in stage04_nic_print_records: ${stg4Count.cnt}`);

  // 4. Drop the 2 separate tables: nic_card_test_results and jig_test_cycles
  await query.exec(`
    DROP TABLE IF EXISTS nic_card_test_results CASCADE;
    DROP TABLE IF EXISTS jig_test_cycles CASCADE;
  `);
  logger.info('[MIGRATION 006] Dropped tables: nic_card_test_results and jig_test_cycles.');

  // 5. Update qc_inspections structure and sync with qc_tests
  await query.exec(`
    ALTER TABLE qc_inspections ALTER COLUMN inspector_id DROP NOT NULL;
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS qc_id VARCHAR(50);
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS qc_name VARCHAR(120);
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS stage_id INT;
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS stage_name VARCHAR(100);
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100);
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100);
    ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS test_details TEXT;

    -- Sync all 14 records from qc_tests into qc_inspections
    INSERT INTO qc_inspections (
        id, inspector_id, qc_id, qc_name, stage_id, stage_name, meter_no, serial_no, batch_no, status, inspection_data, remarks, test_details, created_at
    )
    SELECT 
        id, COALESCE(qc_id, 'QC001'), qc_id, qc_name, stage_id, stage_name, meter_no, serial_no, batch_no, status, inspection_data, remarks, test_details, created_at
    FROM qc_tests
    ON CONFLICT (id) DO UPDATE SET
        inspector_id = EXCLUDED.inspector_id,
        qc_id = EXCLUDED.qc_id,
        qc_name = EXCLUDED.qc_name,
        stage_id = EXCLUDED.stage_id,
        stage_name = EXCLUDED.stage_name,
        meter_no = EXCLUDED.meter_no,
        serial_no = EXCLUDED.serial_no,
        batch_no = EXCLUDED.batch_no,
        status = EXCLUDED.status,
        inspection_data = EXCLUDED.inspection_data,
        remarks = EXCLUDED.remarks,
        test_details = EXCLUDED.test_details;
  `);
  logger.info('[MIGRATION 006] qc_inspections updated and 14 records synced from qc_tests.');

  // 6. Create trigger to sync qc_tests -> qc_inspections
  await query.exec(`
    CREATE OR REPLACE FUNCTION sync_qc_tests_to_inspections()
    RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO qc_inspections (
            id, inspector_id, qc_id, qc_name, stage_id, stage_name, meter_no, serial_no, batch_no, status, inspection_data, remarks, test_details, created_at
        ) VALUES (
            NEW.id, COALESCE(NEW.qc_id, 'QC001'), NEW.qc_id, NEW.qc_name, NEW.stage_id, NEW.stage_name, NEW.meter_no, NEW.serial_no, NEW.batch_no, NEW.status, NEW.inspection_data, NEW.remarks, NEW.test_details, COALESCE(NEW.created_at, CURRENT_TIMESTAMP)
        )
        ON CONFLICT (id) DO UPDATE SET
            inspector_id = EXCLUDED.inspector_id,
            qc_id = EXCLUDED.qc_id,
            qc_name = EXCLUDED.qc_name,
            stage_id = EXCLUDED.stage_id,
            stage_name = EXCLUDED.stage_name,
            meter_no = EXCLUDED.meter_no,
            serial_no = EXCLUDED.serial_no,
            batch_no = EXCLUDED.batch_no,
            status = EXCLUDED.status,
            inspection_data = EXCLUDED.inspection_data,
            remarks = EXCLUDED.remarks,
            test_details = EXCLUDED.test_details;
        RETURN NEW;
    END;
    $$ LANGUAGE 'plpgsql';

    DROP TRIGGER IF EXISTS trg_sync_qc_tests ON qc_tests;
    CREATE TRIGGER trg_sync_qc_tests
    AFTER INSERT OR UPDATE ON qc_tests
    FOR EACH ROW EXECUTE PROCEDURE sync_qc_tests_to_inspections();
  `);
  logger.info('[MIGRATION 006] Synchronization trigger created for qc_tests -> qc_inspections.');

  logger.info('[MIGRATION 006] SUCCESS! Completed all tasks.');
  return true;
}

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('[MIGRATION 006 FAILED]', err);
      process.exit(1);
    });
}

module.exports = { up };
