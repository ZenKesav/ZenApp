import React from 'react';

export default function SourceBenchControl({
  voltage = 230.00,
  current = 5.000,
  frequency = 50.00,
  powerFactor = '1.0 (UPF)',
  benchConnected = true,
  isTesting = false
}) {
  return (
    <div className="card shadow-sm border-0 mb-4 bg-white">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <i className="ti ti-bolt fs-4 text-warning me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">AC Reference Power Source & Calibration Sync</h6>
            <small className="text-secondary">ZERA / MTE Standard Multi-Channel Reference Source Bench</small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${benchConnected ? 'bg-success' : 'bg-danger'} text-white px-3 py-1 font-mono`}>
            <i className={`ti ${benchConnected ? 'ti-check' : 'ti-x'} me-1`}></i>
            {benchConnected ? 'SOURCE SYNC ONLINE' : 'DISCONNECTED'}
          </span>
          {isTesting && (
            <span className="badge bg-warning text-dark px-3 py-1 font-mono">
              <i className="ti ti-loader spin me-1"></i> RAMPING POWER
            </span>
          )}
        </div>
      </div>

      <div className="card-body p-3">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-primary-subtle p-3 rounded-3 shadow-2xs h-100">
              <span className="text-muted small d-block">Reference AC Voltage</span>
              <strong className="text-primary font-mono fs-4">{voltage.toFixed(2)} V</strong>
              <small className="text-success fw-medium">Tolerance &plusmn; 0.1%</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 bg-success-subtle p-3 rounded-3 shadow-2xs h-100">
              <span className="text-muted small d-block">Reference Current</span>
              <strong className="text-success font-mono fs-4">{current.toFixed(3)} A</strong>
              <small className="text-success fw-medium">Frequency {frequency.toFixed(2)} Hz</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 bg-info-subtle p-3 rounded-3 shadow-2xs h-100">
              <span className="text-muted small d-block">Pulse Error Limit</span>
              <strong className="text-info-emphasis font-mono fs-4">&le; &plusmn; 0.20%</strong>
              <small className="text-info fw-medium font-mono">{powerFactor}</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 bg-warning-subtle p-3 rounded-3 shadow-2xs h-100">
              <span className="text-muted small d-block">Error Lock System</span>
              <strong className="text-warning-emphasis font-mono fs-4">ACTIVE LOCK</strong>
              <small className="text-dark fw-medium">Auto-Lock on &gt;0.20% Error</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
