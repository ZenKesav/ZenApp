import React from 'react';

export default function JigClampControl({ engaged, onToggle, disabled = false }) {
  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <span className="fw-bold text-dark">
          <i className="ti ti-tools text-primary me-1"></i> JIG-01 Pneumatic Clamp
        </span>
        <span className={`badge ${engaged ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'} px-2 py-1`}>
          <i className={`ti ${engaged ? 'ti-lock' : 'ti-lock-open'} me-1`}></i>
          {engaged ? 'Pneumatic Locked (4.5 bar)' : 'Clamp Open'}
        </span>
      </div>
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <div className="small fw-semibold text-dark">SWD Pogo-pin Contact</div>
            <div className="text-secondary small">8-pin spring probe array aligned with PCB JTAG pads</div>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${engaged ? 'btn-outline-danger' : 'btn-success'}`}
            disabled={disabled}
            onClick={() => onToggle(!engaged)}
          >
            <i className={`ti ${engaged ? 'ti-lock-open' : 'ti-lock'} me-1`}></i>
            {engaged ? 'Release Clamp' : 'Engage Clamp'}
          </button>
        </div>
      </div>
    </div>
  );
}
