import React from 'react';

/**
 * HardwarePortHeaderWidget
 * Renders the exact header port status card matching Image 1
 */
export default function HardwarePortHeaderWidget({
  icon = 'ti-usb',
  title = 'Optical Port',
  connected = false,
  checking = false,
  portName = '',
  onOpenSettings
}) {
  const comMatch = portName ? portName.match(/COM\d+/i) : null;
  const shortCom = comMatch ? comMatch[0].toUpperCase() : '';
  const statusDisplay = connected
    ? (shortCom ? `Connected (${shortCom})` : 'Connected')
    : checking
      ? 'Connecting...'
      : 'Disconnected';

  return (
    <div
      className="p-2 px-2.5 rounded-3 bg-white shadow-2xs d-flex align-items-center justify-content-between"
      style={{ gap: '10px' }}
    >
      <div className="d-flex align-items-center" style={{ gap: '10px', minWidth: 0 }}>
        <div
          className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
          style={{ width: '38px', height: '38px' }}
        >
          <i
            className={`ti ${
              checking
                ? 'ti-loader spin text-warning'
                : connected
                  ? 'ti-plug-connected text-success'
                  : icon
            } fs-4`}
          ></i>
        </div>
        <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
          <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13px', lineHeight: 1.2 }}>
            {title}
          </div>
          <div className="d-flex align-items-center small text-nowrap" style={{ gap: '5px', fontSize: '11px' }}>
            <span
              className={`rounded-circle d-inline-block flex-shrink-0 ${
                connected
                  ? 'bg-success'
                  : checking
                    ? 'bg-warning'
                    : 'bg-danger'
              }`}
              style={{ width: '6px', height: '6px' }}
            ></span>
            <span
              className={`fw-medium text-truncate ${
                connected
                  ? 'text-success'
                  : checking
                    ? 'text-warning-emphasis'
                    : 'text-muted'
              }`}
              style={{ maxWidth: '110px' }}
              title={statusDisplay}
            >
              {statusDisplay}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary px-2.5 py-1 fw-semibold shadow-xs d-inline-flex align-items-center text-nowrap flex-shrink-0"
        style={{ height: '32px', fontSize: '12px', gap: '5px' }}
        onClick={onOpenSettings}
        title={`Configure ${title} COM Settings`}
      >
        <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
        <span>Settings</span>
      </button>
    </div>
  );
}
