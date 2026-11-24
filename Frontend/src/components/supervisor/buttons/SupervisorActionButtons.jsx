import React from 'react';

export default function SupervisorActionButtons({
  onForceRetest,
  onOpenAudit,
  onEmergencyStop
}) {
  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-body p-3">
        <div className="row g-2">
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-warning w-100 py-2 shadow-sm text-dark"
              onClick={onForceRetest}
            >
              <i className="ti ti-rotate me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Authorize Stage Retest</span>
            </button>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-outline-primary w-100 py-2"
              onClick={onOpenAudit}
            >
              <i className="ti ti-shield-search me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Station Audit Logs</span>
            </button>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-outline-danger w-100 py-2"
              onClick={onEmergencyStop}
            >
              <i className="ti ti-alert-octagon me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Halt Station Line</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
