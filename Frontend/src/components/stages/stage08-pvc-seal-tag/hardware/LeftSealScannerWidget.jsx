import React from 'react';

export default function LeftSealScannerWidget({ value = '', onChange, onKeyDown, disabled = false }) {
  const isScanned = Boolean(value.trim());

  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-shield-check fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Step 1: PVC Security Seal Barcode</h6>
            <small className="text-secondary">Scan ultrasonic tamper-evident seal</small>
          </div>
        </div>
        <span className={`badge font-mono ${isScanned ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
          <i className={`ti ${isScanned ? 'ti-check' : 'ti-scan'} me-1`}></i>
          {isScanned ? 'SEAL SCANNED' : 'AWAITING SCAN'}
        </span>
      </div>

      <div className="card-body p-3">
        <div className="input-group mb-2">
          <span className="input-group-text bg-light"><i className="ti ti-qrcode"></i></span>
          <input
            type="text"
            className="form-control font-monospace fw-bold text-primary"
            placeholder="Scan Seal QR / Barcode (e.g. SEAL-ZM-892147)..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            autoFocus
          />
        </div>
        <div className="d-flex justify-content-between text-xs text-muted">
          <span>Target Format: SEAL-ZM-XXXXXX</span>
          {isScanned && <span className="text-success fw-bold font-mono">{value}</span>}
        </div>
      </div>
    </div>
  );
}
