import React, { useRef, useEffect } from 'react';

export default function JigLogConsole({ logs = [], isOpen = true, onToggle }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  return (
    <div className="card bg-dark text-white border-secondary mb-3 font-mono shadow-sm">
      <div className="card-header bg-black py-2 px-3 d-flex justify-content-between align-items-center border-secondary">
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-terminal text-info"></i>
          <span className="fw-bold small text-light">Jig Communication Terminal Logs</span>
          <span className="badge bg-secondary text-white text-2xs">{logs.length} Lines</span>
        </div>
        {onToggle && (
          <button
            type="button"
            className="btn btn-xs btn-outline-secondary text-light py-0.5 px-2"
            onClick={onToggle}
          >
            <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'} me-1`}></i>
            {isOpen ? 'Minimize' : 'Expand'}
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="card-body p-3 text-2xs text-light"
          style={{ maxHeight: '180px', overflowY: 'auto', backgroundColor: '#0f172a' }}
        >
          {logs.length === 0 ? (
            <div className="text-secondary opacity-50">Terminal idle. Ready for hardware telemetry packets...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="py-0.5 text-truncate">
                {log}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
