import React from 'react';

export default function LaserActionButtons({
  opticalConnected,
  laserConnected,
  sessionActive,
  onReadOptical,
  onStartMarking,
  onEmergencyStop,
  onOpenCalibration
}) {
  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-body p-3">
        <div className="row g-2">
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-outline-primary w-100 py-2"
              disabled={sessionActive}
              onClick={onReadOptical}
            >
              <i className="ti ti-scan me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Read Optical DLMS</span>
            </button>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-danger w-100 py-2 shadow-sm"
              disabled={sessionActive || !laserConnected}
              onClick={onStartMarking}
            >
              <i className="ti ti-laser me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">
                {sessionActive ? 'Marking In Progress...' : 'Start Laser Marking (F1-F3)'}
              </span>
            </button>
          </div>
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-outline-danger w-100 py-2"
              disabled={!sessionActive}
              onClick={onEmergencyStop}
            >
              <i className="ti ti-alert-octagon me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Emergency Stop</span>
            </button>
          </div>
          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-outline-secondary w-100 py-2"
              onClick={onOpenCalibration}
            >
              <i className="ti ti-settings me-1 fs-5 align-middle"></i>
              <span className="fw-semibold">Calibrate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
