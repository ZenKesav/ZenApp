import React from 'react';

export default function ImeiScanner({ imei, macAddress }) {
  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2">
        <span className="fw-bold text-dark">
          <i className="ti ti-id me-1 text-primary"></i> Modem Credentials Readout
        </span>
      </div>
      <div className="card-body p-3">
        <div className="row g-2">
          <div className="col-6">
            <span className="small text-secondary d-block">Cellular IMEI</span>
            <span className="fw-bold font-monospace text-primary">{imei || 'Awaiting AT+CGSN...'}</span>
          </div>
          <div className="col-6">
            <span className="small text-secondary d-block">Wi-Fi / Mesh MAC Address</span>
            <span className="fw-bold font-monospace text-dark">{macAddress || 'Awaiting MAC read...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
