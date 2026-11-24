import React, { useState } from 'react';

export default function DefectTagModal({ isOpen, meterNo, onClose, onSubmit }) {
  const [defectCategory, setDefectCategory] = useState('Optical DLMS Communication');
  const [severity, setSeverity] = useState('MAJOR');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ defectCategory, severity, description });
    }
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <form onSubmit={handleSubmit}>
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title fw-bold">
                <i className="ti ti-alert-triangle me-2"></i> Tag Defect & Scrap Meter
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <div className="alert alert-danger-subtle text-danger border border-danger-subtle py-2 small mb-3">
                Tagging defect for Meter: <strong>{meterNo}</strong>. This meter will be removed from production and flagged for rework/scrap.
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Defect Taxonomy / Category</label>
                <select
                  className="form-select form-select-sm"
                  value={defectCategory}
                  onChange={(e) => setDefectCategory(e.target.value)}
                >
                  <option value="Optical DLMS Communication">Optical DLMS Communication Failure</option>
                  <option value="Laser Marking Defect">Laser Marking Smudge / Misalignment</option>
                  <option value="Enclosure Scratch/Crack">Enclosure Physical Scratch or Dent</option>
                  <option value="PCB Soldering Defect">PCB Cold Solder Joint</option>
                  <option value="Calibration Drift">Metrology Calibration Drift (&gt;0.5%)</option>
                  <option value="Terminal Block Defect">Terminal Block Screw Stripped</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Severity Level</label>
                <div className="d-flex gap-2">
                  {['MINOR', 'MAJOR', 'CRITICAL'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`btn btn-sm flex-fill ${
                        severity === lvl
                          ? lvl === 'CRITICAL' ? 'btn-danger' : lvl === 'MAJOR' ? 'btn-warning' : 'btn-info'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setSeverity(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Detailed Root Cause Observation</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Describe the failure, error code, or visual anomaly observed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>
            <div className="modal-footer bg-light border-top">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                Confirm Defect & Reject
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
