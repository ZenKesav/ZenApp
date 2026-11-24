import React from 'react';

export default function HexFileUploader({ firmwareVersion, checksum }) {
  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2">
        <span className="fw-bold text-dark">
          <i className="ti ti-file-code text-primary me-1"></i> Loaded Firmware Image
        </span>
      </div>
      <div className="card-body p-3">
        <div className="row g-2">
          <div className="col-8">
            <span className="small text-secondary d-block">Production Binary (.hex)</span>
            <span className="fw-bold font-monospace text-primary">{firmwareVersion}</span>
          </div>
          <div className="col-4 text-end">
            <span className="small text-secondary d-block">Checksum</span>
            <span className="badge bg-light text-dark border font-monospace">{checksum}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
