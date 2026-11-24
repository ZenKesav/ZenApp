import React, { useState } from 'react';

export default function OverrideAuthModal({ isOpen, target, onClose, onConfirm }) {
  const [justification, setJustification] = useState('Fixture contact re-cleaned, re-test authorized');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !target) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Supervisor PIN/Authorization code is required');
      return;
    }
    setError('');
    onConfirm({
      meterNo: target.meter_no || target.serialNo,
      stageNumber: target.stage_number || '09',
      justification,
      pin
    });
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <form onSubmit={handleSubmit}>
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title fw-bold">
                <i className="ti ti-shield-lock me-2"></i> Authorize Stage Failure Override
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <div className="alert alert-warning-subtle text-warning-emphasis border border-warning-subtle py-2 small mb-3">
                You are overriding failure for Meter: <strong>{target.meter_no || target.serialNo}</strong> at Stage <strong>{target.stage_number || '09'}</strong>. This action is permanently audited.
              </div>

              {error && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="ti ti-alert-circle me-1"></i> {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Override Reason / Justification</label>
                <select
                  className="form-select form-select-sm"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                >
                  <option value="Fixture contact re-cleaned, re-test authorized">Fixture contact re-cleaned, re-test authorized</option>
                  <option value="Optical head misaligned initially, realigned">Optical head misaligned initially, realigned</option>
                  <option value="Operator test script sequence error">Operator test script sequence error</option>
                  <option value="Engineering waiver granted">Engineering waiver granted</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Supervisor Authorization PIN</label>
                <input
                  type="password"
                  className="form-control form-control-sm font-monospace"
                  placeholder="Enter 4-6 digit supervisor PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer bg-light border-top">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                Confirm & Override Failure
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
