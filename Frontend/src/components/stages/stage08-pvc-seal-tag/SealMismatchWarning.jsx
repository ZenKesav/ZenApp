import React from 'react';

export default function SealMismatchWarning({ isMismatch = false, reason = '' }) {
  if (!isMismatch) return null;

  return (
    <div className="alert alert-danger border-danger d-flex align-items-center p-3 mb-3 shadow-sm rounded-3">
      <div className="p-2 bg-danger text-white rounded-3 me-3 fs-3 flex-shrink-0">
        <i className="ti ti-alert-triangle"></i>
      </div>
      <div>
        <h6 className="fw-bold text-danger mb-1">
          <i className="ti ti-lock me-1"></i> Mismatch Detected - Ultrasonic Welding Locked
        </h6>
        <p className="mb-0 text-dark small">
          {reason || 'The scanned PVC Security Seal does not match the expected batch serial or is already assigned to another meter unit.'}
        </p>
      </div>
    </div>
  );
}
