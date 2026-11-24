import React from 'react';

export default function MasterBoxProgress({
  cartons = [],
  capacity = 10,
  onRemoveCarton,
  disabled = false
}) {
  const count = cartons.length;
  const pct = Math.min(100, Math.round((count / capacity) * 100));

  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-layers fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Master Shipper Pack Progress</h6>
            <small className="text-secondary">Scan 10 individual cartons to complete master box</small>
          </div>
        </div>
        <span className="badge bg-primary text-white font-mono fs-6 px-2.5 py-1">
          {count} / {capacity} Cartons ({pct}%)
        </span>
      </div>

      <div className="card-body p-3">
        {/* Progress Bar */}
        <div className="progress mb-3" style={{ height: '10px' }}>
          <div
            className={`progress-bar progress-bar-striped ${count === capacity ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>

        {/* Packed Cartons Chips */}
        {cartons.length === 0 ? (
          <div className="text-center py-3 text-muted text-xs">
            <i className="ti ti-package fs-3 d-block mb-1 opacity-50"></i>
            No cartons scanned into this master shipper yet.
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {cartons.map((c, idx) => (
              <span
                key={idx}
                className="badge bg-light text-dark border d-inline-flex align-items-center gap-1.5 p-2 font-mono"
              >
                <i className="ti ti-box text-primary"></i>
                <span>{c}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-xs btn-link text-danger p-0 ms-1"
                    onClick={() => onRemoveCarton(idx)}
                    title="Remove carton from box"
                  >
                    <i className="ti ti-x"></i>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
