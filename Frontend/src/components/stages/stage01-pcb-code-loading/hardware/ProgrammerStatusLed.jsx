import React from 'react';

export default function ProgrammerStatusLed({ connected, status }) {
  const getStatusBadge = () => {
    switch (status) {
      case 'FLASHING':
        return <span className="badge bg-warning text-dark animate-pulse"><i className="ti ti-loader me-1"></i> Flashing Flash Sectors...</span>;
      case 'VERIFYING':
        return <span className="badge bg-info text-white"><i className="ti ti-check me-1"></i> Verifying SHA-256...</span>;
      case 'DONE':
        return <span className="badge bg-success"><i className="ti ti-circle-check me-1"></i> Flashed & Verified</span>;
      case 'ERROR':
        return <span className="badge bg-danger"><i className="ti ti-alert-octagon me-1"></i> Programmer Error</span>;
      default:
        return <span className="badge bg-success-subtle text-success border border-success-subtle"><i className="ti ti-check me-1"></i> Ready for Target</span>;
    }
  };

  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <span className="fw-bold text-dark">
          <i className="ti ti-cpu text-primary me-1"></i> SWD Hardware Programmer
        </span>
        <span className={`badge ${connected ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
          {connected ? 'ST-Link v3 / J-Link Pro' : 'Programmer Disconnected'}
        </span>
      </div>
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="small fw-semibold text-secondary">Interface Protocol</div>
            <div className="fw-bold text-dark">SWD @ 4000 kHz (3.3V Target Target VDD)</div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>
      </div>
    </div>
  );
}
