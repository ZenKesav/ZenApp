import React from 'react';

export default function PalletGrossWeightWidget({
  weight = 5.35,
  connected = true,
  cartonCount = 10,
  capacity = 10
}) {
  const isTargetMet = cartonCount === capacity;

  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-scale fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Industrial Platform Scale (Gross Weight)</h6>
            <small className="text-secondary">Master Shipper Box Target: ~5.30 kg &plusmn; 0.25 kg</small>
          </div>
        </div>
        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} text-white font-mono`}>
          <i className={`ti ${connected ? 'ti-circle-check' : 'ti-alert-circle'} me-1`}></i>
          {connected ? 'SCALE CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      <div className="card-body p-4 text-center">
        <div className="bg-dark text-white rounded-3 p-3 font-mono mb-3 border border-secondary">
          <span className="text-secondary small d-block mb-1">TOTAL SHIPPER GROSS WEIGHT</span>
          <div className="fs-1 fw-bold text-success d-flex align-items-center justify-content-center gap-2">
            <span>{weight.toFixed(2)}</span>
            <span className="fs-5 text-secondary">kg</span>
          </div>
          <div className="mt-2 text-xs text-muted">
            Includes outer double-wall corrugated carton + {cartonCount} packaged meters
          </div>
        </div>

        <div className="d-flex justify-content-between text-xs font-mono text-muted bg-light p-2 rounded border">
          <span>Cartons: <strong>{cartonCount} / {capacity}</strong></span>
          <span>Box Tare: <strong>0.45 kg</strong></span>
          <span>Status: <strong className={isTargetMet ? 'text-success' : 'text-primary'}>{isTargetMet ? 'FULL PACK' : 'ACCUMULATING'}</strong></span>
        </div>
      </div>
    </div>
  );
}
