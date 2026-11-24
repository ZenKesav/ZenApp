import React from 'react';
import { useQcInspection } from '../../hooks/qc/useQcInspection';
import HoldMetersTable from '../../components/qc/tables/HoldMetersTable';

export default function HoldMetersPage() {
  const { holdMeters, loadingHold, fetchHoldAndRejected, submitInspectionVerdict } = useQcInspection();

  const handleRelease = async (meter) => {
    const meterNo = meter.meter_no || meter.serialNo;
    await submitInspectionVerdict(meterNo, 'PASSED', 'Released from hold by QC Officer');
  };

  const handleReject = async (meter) => {
    const meterNo = meter.meter_no || meter.serialNo;
    await submitInspectionVerdict(meterNo, 'FAILED', 'Scrapped from quarantine hold');
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-hourglass text-warning me-2"></i> Quarantine Hold Meters
          </h4>
          <p className="text-secondary small mb-0">
            Meters quarantined due to calibration anomalies, optical dropouts, or awaiting supervisor retest authorization.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchHoldAndRejected}
          disabled={loadingHold}
        >
          <i className={`ti ti-refresh me-1 ${loadingHold ? 'ti-spin' : ''}`}></i> Refresh
        </button>
      </div>

      <HoldMetersTable
        holdMeters={holdMeters}
        loading={loadingHold}
        onRelease={handleRelease}
        onReject={handleReject}
      />
    </div>
  );
}
