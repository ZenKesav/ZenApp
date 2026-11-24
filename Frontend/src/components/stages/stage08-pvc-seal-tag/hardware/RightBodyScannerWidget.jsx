import React from 'react';

export default function RightBodyScannerWidget({ value = '', onChange, onKeyDown, disabled = false }) {
  const isScanned = Boolean(value.trim());

  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-barcode fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Step 2: Meter Body Serial Number</h6>
            <small className="text-secondary">Scan laser-marked meter body QR / Barcode</small>
          </div>
        </div>
        <span className={`badge font-mono ${isScanned ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
          <i className={`ti ${isScanned ? 'ti-check' : 'ti-scan'} me-1`}></i>
          {isScanned ? 'METER SCANNED' : 'AWAITING SCAN'}
        </span>
      </div>

      <div className="card-body p-3">
        <div className="input-group mb-2">
          <span className="input-group-text bg-light"><i className="ti ti-scan"></i></span>
          <input
            type="text"
            className="form-control font-monospace fw-bold text-primary"
            placeholder="Scan Meter Body Barcode (e.g. ZM-MTR-2026-9001)..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
          />
        </div>
        <div className="d-flex justify-content-between text-xs text-muted">
          <span>Target Format: ZM-MTR-YYYY-XXXX</span>
          {isScanned && <span className="text-success fw-bold font-mono">{value}</span>}
        </div>
      </div>
    </div>
  );
}
