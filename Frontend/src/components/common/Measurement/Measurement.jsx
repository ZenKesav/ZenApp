import React from 'react';

export function Measurement({ label, value, unit = '', className = '' }) {
  return (
    <div className={`p-2.5 bg-light rounded-3 border ${className}`}>
      <span className="d-block text-muted small text-uppercase font-mono text-xs">{label}</span>
      <span className="d-block fw-bold fs-6 text-dark font-mono">{value} {unit}</span>
    </div>
  );
}

export default Measurement;
