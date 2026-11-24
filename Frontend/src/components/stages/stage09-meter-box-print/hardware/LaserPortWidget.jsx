import React, { useState } from 'react';

export default function LaserPortWidget({
  connected,
  portName,
  baudRate,
  laserReady,
  sessionActive,
  triggers,
  onConnect,
  onDisconnect,
  onOpenCalibration
}) {
  const [selectedPort, setSelectedPort] = useState('COM1');

  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-laser text-danger fs-3"></i>
          <span className="fw-bold text-dark">Laser Port (20W Fiber Laser)</span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {connected ? (
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
              <i className="ti ti-circle-check me-1"></i> Laser Ready
            </span>
          ) : (
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
              <i className="ti ti-circle-x me-1"></i> Disconnected
            </span>
          )}
          {sessionActive && (
            <span className="badge bg-danger text-white animate-pulse px-2 py-1">
              <i className="ti ti-bolt me-1"></i> MARKING IN PROGRESS
            </span>
          )}
        </div>
      </div>
      <div className="card-body p-3">
        <div className="row g-2 align-items-center mb-3">
          <div className="col-md-5">
            <label className="form-label small fw-semibold text-secondary mb-1">Laser Controller COM Port</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="ti ti-cpu"></i></span>
              <select
                className="form-select form-select-sm"
                value={connected ? portName : selectedPort}
                disabled={connected}
                onChange={(e) => setSelectedPort(e.target.value)}
              >
                <option value="COM1">COM1 - 20W Fiber Laser Marking Machine</option>
                <option value="COM2">COM2 - Laser Galvo Head Controller</option>
                <option value="COM8">COM8 - EzCAD Laser Board</option>
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Laser Protocol</label>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              value="9600 8-N-1 (ASCII Triggers F1/F2/F3)"
              disabled
            />
          </div>
          <div className="col-md-3 d-flex flex-column justify-content-end">
            <label className="form-label small fw-semibold text-secondary mb-1">&nbsp;</label>
            {connected ? (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm w-100"
                onClick={onDisconnect}
              >
                <i className="ti ti-power me-1"></i> Disconnect
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-danger btn-sm w-100"
                onClick={() => onConnect(selectedPort, '9600')}
              >
                <i className="ti ti-laser me-1"></i> Connect Laser
              </button>
            )}
          </div>
        </div>

        {/* Machine Trigger Feedback Signals */}
        <div className="p-2 bg-light rounded border">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-semibold text-dark">
              <i className="ti ti-activity me-1 text-primary"></i> Machine Request Telemetry
            </span>
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none p-0 text-secondary small"
              onClick={onOpenCalibration}
            >
              <i className="ti ti-adjustments me-1"></i> Laser Beam Calibration
            </button>
          </div>
          <div className="row g-2 text-center">
            <div className="col-4">
              <div className={`p-2 rounded border ${triggers?.f1 ? 'bg-success-subtle border-success text-success fw-bold' : 'bg-white text-secondary'}`}>
                <div className="small">F1 Request</div>
                <div className="fw-semibold">IMEI Number</div>
                <i className={`ti ${triggers?.f1 ? 'ti-check' : 'ti-clock'} fs-5`}></i>
              </div>
            </div>
            <div className="col-4">
              <div className={`p-2 rounded border ${triggers?.f2 ? 'bg-success-subtle border-success text-success fw-bold' : 'bg-white text-secondary'}`}>
                <div className="small">F2 Request</div>
                <div className="fw-semibold">NIC Serial No</div>
                <i className={`ti ${triggers?.f2 ? 'ti-check' : 'ti-clock'} fs-5`}></i>
              </div>
            </div>
            <div className="col-4">
              <div className={`p-2 rounded border ${triggers?.f3 ? 'bg-success-subtle border-success text-success fw-bold' : 'bg-white text-secondary'}`}>
                <div className="small">F3 Request</div>
                <div className="fw-semibold">Meter Serial No</div>
                <i className={`ti ${triggers?.f3 ? 'ti-check' : 'ti-clock'} fs-5`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
