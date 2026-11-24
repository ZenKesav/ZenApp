import React from 'react';

export default function CartonWeightScaleWidget({
  weight = 486.5,
  isPass = true,
  status = 'PASS',
  onTare,
  isWeighing = false,
  connected = true
}) {
  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-scale fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Digital Scale Gross Weight Telemetry</h6>
            <small className="text-secondary">RS-232 Precision Weighing Platform (Target: 485g &plusmn; 15g)</small>
          </div>
        </div>
        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} text-white font-mono`}>
          <i className={`ti ${connected ? 'ti-circle-check' : 'ti-alert-circle'} me-1`}></i>
          {connected ? 'SCALE CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      <div className="card-body p-4 text-center">
        <div className="bg-dark text-white rounded-3 p-3 font-mono mb-3 border border-secondary shadow-inner">
          <span className="text-secondary small d-block mb-1">METER + CARTON GROSS WEIGHT</span>
          <div className="fs-1 fw-bold text-success d-flex align-items-center justify-content-center gap-2">
            <span>{weight.toFixed(1)}</span>
            <span className="fs-5 text-secondary">grams</span>
          </div>
          <div className="d-flex justify-content-center gap-2 mt-2">
            <span className={`badge px-3 py-1 font-mono fs-6 ${isPass ? 'bg-success text-white' : 'bg-danger text-white'}`}>
              <i className={`ti ${isPass ? 'ti-check' : 'ti-alert-triangle'} me-1`}></i>
              {isPass ? 'WEIGHT PASS (470g - 500g)' : `${status} REJECT`}
            </span>
          </div>
        </div>

        <div className="d-flex justify-content-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold"
            onClick={onTare}
            disabled={isWeighing}
          >
            <i className="ti ti-rotate-clockwise me-1"></i> Tare Zero Scale
          </button>
        </div>
      </div>
    </div>
  );
}
