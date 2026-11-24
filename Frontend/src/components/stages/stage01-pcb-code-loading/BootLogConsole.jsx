import React from 'react';

export default function BootLogConsole({ logs = [] }) {
  return (
    <div className="card shadow-sm border-0 bg-dark text-white font-monospace">
      <div className="card-header bg-black py-2 px-3 border-secondary d-flex justify-content-between align-items-center">
        <span className="small text-info fw-bold">
          <i className="ti ti-terminal me-2"></i> SWD / JTAG Live Programmer Telemetry Log
        </span>
        <span className="badge bg-secondary text-xs">{logs.length} entries</span>
      </div>
      <div className="card-body p-3 overflow-auto" style={{ maxHeight: '200px', fontSize: '0.8rem' }}>
        {logs.map((lg) => (
          <div key={lg.id} className="py-0.5 border-bottom border-secondary border-opacity-25">
            <span className="text-secondary me-2">[{lg.time}]</span>
            <span className={
              lg.type === 'error' ? 'text-danger fw-bold' :
              lg.type === 'success' ? 'text-success fw-bold' : 'text-light'
            }>
              {lg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
