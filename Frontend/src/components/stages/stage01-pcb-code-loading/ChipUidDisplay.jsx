import React from 'react';

export default function ChipUidDisplay({ chipUid }) {
  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white border-bottom py-2">
        <span className="fw-bold text-dark">
          <i className="ti ti-fingerprint text-primary me-1"></i> Target MCU 96-bit Unique ID
        </span>
      </div>
      <div className="card-body p-3">
        <div className="font-monospace fw-bold text-success fs-6 bg-light p-2 rounded border text-center">
          {chipUid || 'Awaiting target SWD read...'}
        </div>
      </div>
    </div>
  );
}
