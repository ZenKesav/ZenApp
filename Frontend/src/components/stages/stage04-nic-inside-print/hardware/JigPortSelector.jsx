import React from 'react';

export default function JigPortSelector({
  availablePorts = [],
  selectedPort = 'DEMO-PORT-01',
  onPortSelect,
  usbConnected = false,
  usbDeviceName = null,
  onConnect,
  onDisconnect,
  disabled = false
}) {
  return (
    <div className="card shadow-sm border mb-4">
      <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-usb fs-4 text-primary"></i>
            <span className="fw-bold text-dark small">Hardware COM Port:</span>
          </div>

          <div style={{ minWidth: '280px' }}>
            <select
              className="form-select form-select-sm font-mono"
              value={selectedPort}
              onChange={(e) => onPortSelect(e.target.value)}
              disabled={usbConnected || disabled}
            >
              {availablePorts.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.friendlyName || p.path}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${usbConnected ? 'btn-outline-danger' : 'btn-primary'} fw-semibold`}
            onClick={usbConnected ? onDisconnect : onConnect}
            disabled={disabled}
          >
            <i className={`ti ${usbConnected ? 'ti-plug-off' : 'ti-plug'} me-1`}></i>
            {usbConnected ? 'Disconnect' : 'Connect Port'}
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="text-secondary small">Hardware Status:</span>
          <span
            className={`badge px-2.5 py-1.5 font-mono ${
              usbConnected
                ? 'bg-success-subtle text-success border border-success'
                : 'bg-secondary-subtle text-secondary border'
            }`}
          >
            <i className={`ti ${usbConnected ? 'ti-circle-check' : 'ti-circle-x'} me-1`}></i>
            {usbConnected ? (usbDeviceName || 'Connected') : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
