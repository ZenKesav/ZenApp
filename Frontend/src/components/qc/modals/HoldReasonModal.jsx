import React, { useState } from 'react';

export default function HoldReasonModal({ isOpen, meterNo, onClose, onSubmit }) {
  const [reason, setReason] = useState('Optical Handshake Intermittent');
  const [quarantineZone, setQuarantineZone] = useState('Shelf A-3');
  const [notifySupervisor, setNotifySupervisor] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ reason, quarantineZone, notifySupervisor });
    }
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <form onSubmit={handleSubmit}>
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title fw-bold">
                <i className="ti ti-hourglass me-2"></i> Quarantine Hold Meter
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <div className="alert alert-warning-subtle text-warning-emphasis border border-warning-subtle py-2 small mb-3">
                Place Meter <strong>{meterNo}</strong> into quarantine hold pending engineering or supervisor review.
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Hold Justification</label>
                <select
                  className="form-select form-select-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="Optical Handshake Intermittent">Optical Handshake Intermittent</option>
                  <option value="Laser Etch Contrast Borderline">Laser Etch Contrast Borderline</option>
                  <option value="RTC Battery Voltage Low">RTC Battery Voltage Low</option>
                  <option value="Metrology Tolerance Outlier">Metrology Tolerance Outlier (&plusmn;0.8%)</option>
                  <option value="Awaiting Supervisor Sign-off">Awaiting Supervisor Sign-off</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Quarantine Storage Location</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={quarantineZone}
                  onChange={(e) => setQuarantineZone(e.target.value)}
                  placeholder="e.g. Shelf A-3 / Bin 12"
                  required
                />
              </div>

              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notifySupervisorSwitch"
                  checked={notifySupervisor}
                  onChange={(e) => setNotifySupervisor(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="notifySupervisorSwitch">
                  Dispatch alert to Line Supervisor immediately
                </label>
              </div>
            </div>
            <div className="modal-footer bg-light border-top">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                Confirm Quarantine Hold
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
