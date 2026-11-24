import React from 'react';

export default function QCActionButtons({
  meterNo,
  disabled = false,
  onPass,
  onHold,
  onReject
}) {
  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="small text-secondary fw-semibold">
            Inspection Verdict for Meter: <strong className="text-primary font-monospace">{meterNo || 'None Selected'}</strong>
          </span>
        </div>
        <div className="row g-2">
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-success w-100 py-2 shadow-sm"
              disabled={disabled || !meterNo}
              onClick={onPass}
            >
              <i className="ti ti-circle-check me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Pass Inspection</span>
            </button>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-warning w-100 py-2 shadow-sm text-dark"
              disabled={disabled || !meterNo}
              onClick={onHold}
            >
              <i className="ti ti-hourglass me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Quarantine Hold</span>
            </button>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-danger w-100 py-2 shadow-sm"
              disabled={disabled || !meterNo}
              onClick={onReject}
            >
              <i className="ti ti-circle-x me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Reject & Scrap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
