import React, { useState } from 'react';

export default function LaserCalibrationModal({ isOpen, onClose, onSave }) {
  const [focalLength, setFocalLength] = useState('160'); // mm
  const [power, setPower] = useState('85'); // %
  const [speed, setSpeed] = useState('800'); // mm/s
  const [frequency, setFrequency] = useState('30'); // kHz

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave) {
      onSave({ focalLength, power, speed, frequency });
    }
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-adjustments me-2"></i> Laser Beam Calibration
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Focal Length Lens (F-Theta)</label>
              <select
                className="form-select form-select-sm"
                value={focalLength}
                onChange={(e) => setFocalLength(e.target.value)}
              >
                <option value="160">F=160mm (Field 110x110mm - Standard Enclosure)</option>
                <option value="210">F=210mm (Field 150x150mm - Large Polycarbonate)</option>
                <option value="254">F=254mm (Field 175x175mm)</option>
              </select>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-semibold text-secondary">Laser Power Output</label>
                <span className="small fw-bold text-danger">{power}%</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="10"
                max="100"
                step="5"
                value={power}
                onChange={(e) => setPower(e.target.value)}
              />
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '11px' }}>
                <span>10% (Surface Tint)</span>
                <span>85% (Optimal Polycarbonate Etch)</span>
                <span>100% (Deep Mark)</span>
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold text-secondary">Marking Speed (mm/s)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-secondary">Frequency (kHz)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </div>
            </div>

            <div className="alert alert-warning border-0 small mb-0">
              <i className="ti ti-alert-triangle me-1"></i>
              Ensure safety glasses (OD6+ @ 1064nm) are worn before firing calibration test marks.
            </div>
          </div>
          <div className="modal-footer bg-light border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleSave}>
              Save Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
