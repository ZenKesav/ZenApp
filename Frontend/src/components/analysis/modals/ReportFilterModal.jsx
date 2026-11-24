import React, { useState } from 'react';

export default function ReportFilterModal({ isOpen, onClose, onApply }) {
  const [stage, setStage] = useState('');
  const [shift, setShift] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    if (onApply) {
      onApply({ stage, shift });
    }
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-light border-bottom">
            <h5 className="modal-title fw-bold text-dark">
              <i className="ti ti-filter me-2 text-primary"></i> Filter Production Reports
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Production Stage</label>
              <select
                className="form-select form-select-sm"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">All Production Stages (1 to 11)</option>
                <option value="4">Stage 04 - NIC Inside Print</option>
                <option value="6">Stage 06 - Automatic Calibration</option>
                <option value="7">Stage 07 - Final Validation</option>
                <option value="9">Stage 09 - Meter Box Laser Print</option>
                <option value="10">Stage 10 - Carton Pack</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Work Shift</label>
              <select
                className="form-select form-select-sm"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
              >
                <option value="">All Shifts (24 Hours)</option>
                <option value="Shift A">Shift A (Morning 06:00 - 14:00)</option>
                <option value="Shift B">Shift B (Evening 14:00 - 22:00)</option>
                <option value="Shift C">Shift C (Night 22:00 - 06:00)</option>
              </select>
            </div>
          </div>
          <div className="modal-footer bg-light border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApply}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
