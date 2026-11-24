import React from 'react';

export default function OpticalProbeHeadStatus({ connected = true, baudRate = '9600 8N1', protocol = 'DLMS / COSEM (IEC 62056-21)' }) {
  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-header bg-white py-2 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-access-point fs-5 text-primary me-2"></i>
          <span className="fw-bold text-dark">Optical Head Communication Interface</span>
        </div>
        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} text-white font-mono`}>
          <i className={`ti ${connected ? 'ti-circle-check' : 'ti-alert-circle'} me-1`}></i>
          {connected ? 'PROBE LOCKED' : 'DISCONNECTED'}
        </span>
      </div>
      <div className="card-body p-3">
        <div className="row g-2 font-mono text-xs">
          <div className="col-4">
            <span className="text-muted d-block">Physical Port:</span>
            <strong className="text-dark">Optical Flange Head #1</strong>
          </div>
          <div className="col-4">
            <span className="text-muted d-block">Baud Rate:</span>
            <strong className="text-primary">{baudRate}</strong>
          </div>
          <div className="col-4">
            <span className="text-muted d-block">Standard:</span>
            <strong className="text-success">{protocol}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
