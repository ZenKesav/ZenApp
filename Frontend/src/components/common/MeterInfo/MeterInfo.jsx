import React from 'react';
import StatusBadge from '../StatusBadge/StatusBadge';

export function MeterInfo({ meter, className = '' }) {
  if (!meter) return null;
  return (
    <div className={`card border-0 shadow-sm rounded-4 bg-white p-3 p-sm-4 ${className}`}>
      <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
        <h4 className="fs-6 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
          <i className="ti ti-cpu text-primary fs-5"></i>
          <span>Meter: {meter.meter_no}</span>
        </h4>
        <StatusBadge status={meter.status} />
      </div>
      <div className="row g-2.5 small">
        <div className="col-12 col-sm-6">
          <span className="text-muted d-block text-xs font-mono">BATCH NO:</span>
          <span className="fw-semibold text-dark font-mono">{meter.batch_no || 'N/A'}</span>
        </div>
        <div className="col-12 col-sm-6">
          <span className="text-muted d-block text-xs font-mono">MODEL / TYPE:</span>
          <span className="fw-semibold text-dark">{meter.model || 'Single Phase'}</span>
        </div>
        <div className="col-12 col-sm-6">
          <span className="text-muted d-block text-xs font-mono">CURRENT STAGE:</span>
          <span className="badge bg-dark text-white font-mono">Stage {meter.current_stage || 1}</span>
        </div>
        <div className="col-12 col-sm-6">
          <span className="text-muted d-block text-xs font-mono">SERIAL NO:</span>
          <span className="fw-semibold text-dark font-mono">{meter.serial_no || meter.meter_no}</span>
        </div>
      </div>
    </div>
  );
}

export default MeterInfo;
