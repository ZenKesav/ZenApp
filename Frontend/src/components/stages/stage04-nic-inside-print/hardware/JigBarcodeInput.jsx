import React from 'react';

export default function JigBarcodeInput({
  channelNumber,
  targetImei = '',
  scannedValue = '',
  validationStatus = null,
  onScanInput,
  inputRef
}) {
  const getBadge = () => {
    if (validationStatus === 'MATCHED') {
      return <span className="badge bg-success text-white"><i className="ti ti-check me-1"></i>MATCHED</span>;
    }
    if (validationStatus === 'MISMATCH') {
      return <span className="badge bg-danger text-white"><i className="ti ti-x me-1"></i>MISMATCH</span>;
    }
    return <span className="badge bg-light text-muted border">WAITING SCAN</span>;
  };

  return (
    <div className="card border p-2.5 mb-2 shadow-2xs">
      <div className="d-flex justify-content-between align-items-center mb-1.5">
        <span className="fw-bold small text-dark">Channel {channelNumber}</span>
        {getBadge()}
      </div>
      <div className="text-2xs text-muted mb-1 font-mono">
        Target IMEI: <strong className="text-dark">{targetImei || 'None'}</strong>
      </div>
      <input
        ref={inputRef}
        type="text"
        className={`form-control form-control-sm font-mono ${
          validationStatus === 'MATCHED'
            ? 'border-success bg-success-subtle'
            : validationStatus === 'MISMATCH'
            ? 'border-danger bg-danger-subtle'
            : ''
        }`}
        placeholder="Scan Barcode / 2D QR..."
        value={scannedValue}
        onChange={(e) => onScanInput(e.target.value)}
      />
    </div>
  );
}
