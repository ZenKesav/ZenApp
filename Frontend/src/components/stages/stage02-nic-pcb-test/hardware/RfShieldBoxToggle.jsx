import React from 'react';

export default function RfShieldBoxToggle({ closed, onToggle, disabled = false }) {
  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <span className="fw-bold text-dark">
          <i className="ti ti-shield text-primary me-1"></i> Pneumatic RF Shield Box
        </span>
        <span className={`badge ${closed ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} px-2 py-1`}>
          <i className={`ti ${closed ? 'ti-check' : 'ti-alert-triangle'} me-1`}></i>
          {closed ? 'Shield Box Sealed (-65dB)' : 'Safety Interlock Open'}
        </span>
      </div>
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="small fw-semibold text-dark">Faraday Cage RF Enclosure</div>
            <div className="text-secondary small">Isolates cellular 4G/NB-IoT antenna emissions during OTA test</div>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${closed ? 'btn-outline-danger' : 'btn-success'}`}
            disabled={disabled}
            onClick={() => onToggle(!closed)}
          >
            {closed ? 'Open RF Lid' : 'Seal RF Box'}
          </button>
        </div>
      </div>
    </div>
  );
}
