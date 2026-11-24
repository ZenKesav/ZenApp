import React from 'react';

export default function SignalRssiGauge({ rssi, rsrp, sinr, networkOperator, modemStatus }) {
  const getQualityText = () => {
    if (rssi >= -75) return { text: 'EXCELLENT', color: 'text-success' };
    if (rssi >= -85) return { text: 'GOOD', color: 'text-primary' };
    if (rssi >= -95) return { text: 'FAIR', color: 'text-warning' };
    return { text: 'POOR', color: 'text-danger' };
  };

  const quality = getQualityText();

  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <span className="fw-bold text-dark">
          <i className="ti ti-antenna-bars-5 text-primary me-1"></i> RF Signal & Telemetry Metrics
        </span>
        <span className="badge bg-light text-dark border font-monospace">{networkOperator}</span>
      </div>
      <div className="card-body p-3">
        <div className="row g-3 text-center">
          <div className="col-4">
            <span className="small text-secondary d-block">RSSI Power</span>
            <h4 className={`fw-bold mb-0 ${quality.color}`}>{rssi} dBm</h4>
            <span className="small text-muted">{quality.text}</span>
          </div>
          <div className="col-4">
            <span className="small text-secondary d-block">RSRP</span>
            <h4 className="fw-bold mb-0 text-dark">{rsrp} dBm</h4>
            <span className="small text-muted">Carrier Level</span>
          </div>
          <div className="col-4">
            <span className="small text-secondary d-block">SINR Ratio</span>
            <h4 className="fw-bold mb-0 text-primary">{sinr} dB</h4>
            <span className="small text-muted">{modemStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
