import React from 'react';

export default function JigChannelGrid({
  channels = [],
  dbDuplicates = [],
  onEditChannel
}) {
  const getChannelStyle = (c) => {
    const isDuplicate = dbDuplicates.includes(c.imei);
    if (c.st === 'TESTING') {
      return {
        border: '2px solid #3b82f6',
        badge: 'bg-primary text-white',
        text: 'TESTING',
        icon: 'ti-loader spin'
      };
    }
    if (isDuplicate) {
      return {
        border: '2px solid #f59e0b',
        badge: 'bg-warning text-dark fw-bold',
        text: 'DUPLICATE',
        icon: 'ti-alert-triangle'
      };
    }
    if (c.st === 'FAIL') {
      return {
        border: '2px solid #ef4444',
        badge: 'bg-danger text-white fw-bold',
        text: 'FAIL',
        icon: 'ti-alert-circle'
      };
    }
    if (c.st === 'PASS' || c.st === 'CON') {
      return {
        border: '2px solid #10b981',
        badge: 'bg-success text-white fw-bold',
        text: 'PASS',
        icon: 'ti-check'
      };
    }
    return {
      border: '1px solid #e2e8f0',
      badge: 'bg-secondary-subtle text-secondary border',
      text: c.st || 'NCON',
      icon: 'ti-power'
    };
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fs-5 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
          <i className="ti ti-layout-grid text-primary"></i>
          <span>8-Channel Hardware Telemetry Output</span>
        </h4>
      </div>

      <div className="row g-3">
        {channels.map((c) => {
          const style = getChannelStyle(c);
          return (
            <div key={c.ch} className="col-lg-3 col-md-6 col-12">
              <div
                className="card h-100 transition-all shadow-sm"
                style={{ border: style.border, backgroundColor: '#ffffff' }}
              >
                <div className="card-header bg-transparent py-2 px-3 d-flex justify-content-between align-items-center border-bottom">
                  <div className="d-flex align-items-center gap-1">
                    <i className="ti ti-cpu text-primary"></i>
                    <span className="fw-bold text-dark small">Channel {c.ch}</span>
                  </div>
                  <span className={`badge ${style.badge} font-mono px-2 py-0.5 text-xs`}>
                    <i className={`ti ${style.icon} me-1`}></i>
                    {style.text}
                  </span>
                </div>

                <div className="card-body p-3 font-mono text-xs">
                  <div className="d-flex flex-column gap-1.5">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">IMEI:</span>
                      <strong className="text-dark font-mono text-truncate" style={{ maxWidth: '140px' }}>
                        {c.imei || '-'}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">HW / FW:</span>
                      <span className="text-dark">{c.hwv || '-'} / {c.fwv || '-'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">SIM Status:</span>
                      <span className={c.sim === 'INSERTED' ? 'text-success fw-bold' : 'text-muted'}>
                        {c.sim || '-'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Signal:</span>
                      <span className="text-dark">{c.rssi || '-'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Voltage / Curr:</span>
                      <span className="text-dark">{c.volt || '-'} / {c.curr || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
