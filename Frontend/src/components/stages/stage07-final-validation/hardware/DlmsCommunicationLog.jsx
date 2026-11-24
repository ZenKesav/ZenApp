import React from 'react';

export default function DlmsCommunicationLog({ logs = [] }) {
  return (
    <div className="card bg-dark text-white border-secondary font-mono shadow-sm mb-3">
      <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
        <span className="small text-secondary fw-bold">
          <i className="ti ti-terminal me-2 text-info"></i>DLMS / HDLC Optical Communication Telemetry
        </span>
        <span className="badge bg-secondary text-white text-xs">OBIS Channel</span>
      </div>
      <div className="card-body p-3 overflow-auto" style={{ maxHeight: '200px', fontSize: '0.785rem' }}>
        {logs.map((lg) => (
          <div key={lg.id} className="py-0.5 text-light opacity-90">
            <span className="text-muted me-2">[{lg.time}]</span>
            <span className={lg.type === 'success' ? 'text-success' : lg.type === 'error' ? 'text-danger' : 'text-light'}>
              {lg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
