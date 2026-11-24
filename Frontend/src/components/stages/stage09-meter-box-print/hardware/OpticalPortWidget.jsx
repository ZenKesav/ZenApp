import React, { useState } from 'react';

export default function OpticalPortWidget({
  connected,
  portName,
  baudRate,
  connecting,
  autoReconnect,
  onAutoReconnectChange,
  onConnect,
  onDisconnect,
  onOpenGuide
}) {
  const [selectedPort, setSelectedPort] = useState('COM3');
  const [selectedBaud, setSelectedBaud] = useState(baudRate || '9600');

  const baudOptions = ['1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'];

  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-plug text-primary fs-3"></i>
          <span className="fw-bold text-dark">Optical Port (DLMS Probe)</span>
        </div>
        <div>
          {connected ? (
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
              <i className="ti ti-circle-check me-1"></i> Connected
            </span>
          ) : connecting ? (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
              <span className="spinner-border spinner-border-sm me-1" role="status"></span> Connecting...
            </span>
          ) : (
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
              <i className="ti ti-circle-x me-1"></i> Disconnected
            </span>
          )}
        </div>
      </div>
      <div className="card-body p-3">
        <div className="row g-2 align-items-center mb-3">
          <div className="col-md-5">
            <label className="form-label small fw-semibold text-secondary mb-1">Optical Serial Port</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="ti ti-usb"></i></span>
              <select
                className="form-select form-select-sm"
                value={connected ? portName : selectedPort}
                disabled={connected}
                onChange={(e) => setSelectedPort(e.target.value)}
              >
                <option value="COM3">COM3 - USB DLMS Optical Probe</option>
                <option value="COM4">COM4 - FTDI Optical Head</option>
                <option value="COM5">COM5 - Prolific Serial</option>
                <option value="Custom">Custom Serial Port...</option>
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Baud Rate (DLMS)</label>
            <select
              className="form-select form-select-sm"
              value={connected ? baudRate : selectedBaud}
              disabled={connected}
              onChange={(e) => setSelectedBaud(e.target.value)}
            >
              {baudOptions.map(b => (
                <option key={b} value={b}>{b} Baud</option>
              ))}
            </select>
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
                className="btn btn-primary btn-sm w-100"
                disabled={connecting}
                onClick={() => onConnect(selectedPort, selectedBaud)}
              >
                <i className="ti ti-plug me-1"></i> Connect Probe
              </button>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="opticalAutoReconnectSwitch"
              checked={autoReconnect}
              onChange={(e) => onAutoReconnectChange(e.target.checked)}
            />
            <label className="form-check-label small text-secondary" htmlFor="opticalAutoReconnectSwitch">
              Auto-reconnect on USB drop
            </label>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none p-0 text-primary small"
            onClick={onOpenGuide}
          >
            <i className="ti ti-help-circle me-1"></i> Optical Setup Guide
          </button>
        </div>
      </div>
    </div>
  );
}
