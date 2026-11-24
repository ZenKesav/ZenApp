import React from 'react';
import { useQcInspection } from '../../hooks/qc/useQcInspection';
import RejectedMetersTable from '../../components/qc/tables/RejectedMetersTable';

export default function RejectedMetersPage() {
  const { rejectedMeters, loadingRejected, fetchHoldAndRejected } = useQcInspection();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-trash text-danger me-2"></i> Scrapped & Rejected Meters
          </h4>
          <p className="text-secondary small mb-0">
            Log of unrecoverable defects, laser misprints, and failed metrology test items quarantined for scrap disposal.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchHoldAndRejected}
          disabled={loadingRejected}
        >
          <i className={`ti ti-refresh me-1 ${loadingRejected ? 'ti-spin' : ''}`}></i> Refresh
        </button>
      </div>

      <RejectedMetersTable
        rejectedMeters={rejectedMeters}
        loading={loadingRejected}
      />
    </div>
  );
}
