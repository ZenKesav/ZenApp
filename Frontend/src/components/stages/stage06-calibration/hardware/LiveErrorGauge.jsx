import React from 'react';

export default function LiveErrorGauge({ errorPct = 0, limit = 0.20 }) {
  const isPass = Math.abs(errorPct) <= limit;
  // Calculate percentage offset for gauge bar (-0.40% to +0.40% mapped to 0% to 100%)
  const clampedErr = Math.max(-0.40, Math.min(0.40, errorPct));
  const percentPos = ((clampedErr + 0.40) / 0.80) * 100;

  return (
    <div className="p-3 bg-light rounded-3 border">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-secondary fw-semibold">Pulse Error Tolerance Gauge</span>
        <span className={`badge font-mono ${isPass ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'}`}>
          {isPass ? 'IN TOLERANCE' : 'OUT OF LIMIT'}
        </span>
      </div>

      <div className="position-relative my-3" style={{ height: '24px' }}>
        {/* Background track */}
        <div className="w-100 h-100 bg-secondary-subtle rounded-pill position-relative overflow-hidden d-flex">
          {/* Fail left zone: -0.40 to -0.20 (25%) */}
          <div style={{ width: '25%', backgroundColor: 'rgba(239, 68, 68, 0.25)' }}></div>
          {/* Pass middle zone: -0.20 to +0.20 (50%) */}
          <div style={{ width: '50%', backgroundColor: 'rgba(34, 197, 94, 0.25)' }}></div>
          {/* Fail right zone: +0.20 to +0.40 (25%) */}
          <div style={{ width: '25%', backgroundColor: 'rgba(239, 68, 68, 0.25)' }}></div>
        </div>

        {/* Center 0% Marker */}
        <div
          className="position-absolute top-0 bottom-0 border-start border-dark border-2"
          style={{ left: '50%', zIndex: 2 }}
          title="0.00% Error"
        ></div>

        {/* Pointer indicator */}
        <div
          className="position-absolute top-50 translate-middle"
          style={{
            left: `${percentPos}%`,
            transition: 'left 0.4s ease-out',
            zIndex: 3
          }}
        >
          <div
            className={`badge rounded-circle p-1 shadow-sm ${isPass ? 'bg-success text-white' : 'bg-danger text-white'}`}
            style={{ width: '18px', height: '18px' }}
          ></div>
        </div>
      </div>

      <div className="d-flex justify-content-between font-mono text-muted text-xs">
        <span>-0.40%</span>
        <span className="text-danger fw-bold">-0.20% (MPE)</span>
        <span className="text-dark fw-bold">0.00%</span>
        <span className="text-danger fw-bold">+0.20% (MPE)</span>
        <span>+0.40%</span>
      </div>
    </div>
  );
}
