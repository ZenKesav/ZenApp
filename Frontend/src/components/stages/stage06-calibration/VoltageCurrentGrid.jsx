import React from 'react';

export default function VoltageCurrentGrid({ meters = [], onSaveDb, isTesting = false }) {
  return (
    <div className="card shadow-sm border-0 mb-4 bg-white">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <i className="ti ti-layout-grid fs-4 me-2 text-primary"></i>
          <div>
            <h5 className="mb-0 fw-bold text-dark">Multi-Position Calibration Bench Telemetry</h5>
            <small className="text-secondary">Simultaneous 6 to 10 channel opto-pulse measurement</small>
          </div>
        </div>
        <button
          className="btn btn-sm btn-success fw-semibold shadow-2xs"
          onClick={onSaveDb}
          disabled={isTesting}
        >
          <i className="ti ti-database-check me-1"></i> Save Calibration to DB
        </button>
      </div>

      <div className="card-body p-4">
        <div className="row g-3">
          {meters.map((m, idx) => {
            const isPass = m.status === 'PASS' || m.status === 'PASSED';
            const errorVal = Number(m.error_pct ?? m.errorPct ?? 0);
            const serialNo = m.serial_no || m.meterNo || `ZM-MTR-${6001 + idx}`;
            const posNo = m.pos || m.id || idx + 1;
            const voltageVal = m.voltage || 230.0;
            const currentVal = m.current || 5.0;
            const powerVal = m.power || 1150.0;
            const pulseRateVal = m.pulse_rate || m.pulseRate || 1600;
            const errorLockVal = m.error_lock || m.errorLock || (isPass ? 'NO LOCK' : 'ACTIVE LOCK');

            return (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className={`border rounded-3 p-3 transition-all h-100 shadow-2xs ${isPass ? 'border-success-subtle bg-white' : 'border-danger-subtle bg-white'}`}>
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <span className="badge bg-dark text-white font-mono px-2 py-1">Position #{posNo}</span>
                    <span className={`badge ${isPass ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'} font-mono`}>
                      <i className={`ti ${isPass ? 'ti-check' : 'ti-x'} me-1`}></i>
                      {isPass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted d-block">Meter Serial Number</small>
                    <strong className="text-dark font-mono fs-6">{serialNo}</strong>
                  </div>

                  <div className="row g-2 font-mono text-xs my-2 bg-light p-2 rounded border">
                    <div className="col-6">
                      <span className="text-muted d-block">Voltage (V):</span>
                      <strong className="text-primary">{voltageVal} V</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Current (A):</span>
                      <strong className="text-success">{currentVal} A</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Active Power:</span>
                      <strong className="text-dark">{powerVal} W</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Pulse Rate:</span>
                      <strong className="text-dark">{pulseRateVal} imp/kWh</strong>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    <div>
                      <span className="text-muted small d-block">Pulse Error %</span>
                      <strong className={`fs-5 font-mono ${Math.abs(errorVal) <= 0.20 ? 'text-success' : 'text-danger'}`}>
                        {errorVal > 0 ? `+${errorVal.toFixed(2)}%` : `${errorVal.toFixed(2)}%`}
                      </strong>
                    </div>
                    <div className="text-end">
                      <span className="text-muted small d-block">Error Lock</span>
                      <span className={`badge px-2 py-1 ${errorLockVal === 'NO LOCK' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                        <i className={`ti ${errorLockVal === 'NO LOCK' ? 'ti-lock-open' : 'ti-lock'} me-1`}></i>
                        {errorLockVal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
