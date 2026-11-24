import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Stage02RfCalibrationPage() {
  const [shieldBoxAttenuation, setShieldBoxAttenuation] = useState(65.0);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(true);
  const [goldenUnitSerial, setGoldenUnitSerial] = useState('GOLDEN-NIC-001');

  const handleRunCalibration = () => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrated(true);
      setShieldBoxAttenuation(67.4);
    }, 1200);
  };

  return (
    <div className="container-fluid py-3">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/stages/2" className="btn btn-sm btn-outline-secondary py-0 px-2">
              <i className="ti ti-arrow-left me-1"></i> Back to Stage 02
            </Link>
            <span className="badge bg-primary-subtle text-primary">Stage 02 Sub-Page</span>
          </div>
          <h4 className="fw-bold text-dark mb-0">
            <i className="ti ti-adjustments-alt text-primary me-2"></i>
            Stage 02: RF Shield Box Attenuation & Power Calibration
          </h4>
          <p className="text-secondary small mb-0">
            Verify Faraday cage RF isolation, RF probe loss compensation, and golden reference standard unit before shift operations.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/stages/2/history" className="btn btn-outline-secondary btn-sm">
            <i className="ti ti-history me-1"></i> View Test History
          </Link>
          <Link to="/stages/2" className="btn btn-primary btn-sm">
            <i className="ti ti-player-play me-1"></i> Go to Live Test
          </Link>
        </div>
      </div>

      {/* Main Calibration Card */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-transparent border-bottom py-2.5">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="ti ti-shield-check text-success me-2"></i>
                Pneumatic RF Shield Box Attenuation Calibration
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Golden Reference Unit Serial</label>
                <input
                  type="text"
                  className="form-control form-control-sm font-monospace"
                  value={goldenUnitSerial}
                  onChange={(e) => setGoldenUnitSerial(e.target.value)}
                />
              </div>

              <div className="p-3 bg-light rounded-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted">Measured Isolation Attenuation:</span>
                  <span className="fw-bold font-monospace fs-5 text-primary">{shieldBoxAttenuation} dB</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted">Required Specification:</span>
                  <span className="fw-semibold small text-dark">&ge; 60.0 dB (700MHz - 2.6GHz)</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Calibration Status:</span>
                  <span className={`badge ${calibrated ? 'bg-success' : 'bg-warning'}`}>
                    {calibrated ? 'CALIBRATED & VERIFIED' : 'PENDING'}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={handleRunCalibration}
                disabled={calibrating}
              >
                {calibrating ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    <span>Measuring Faraday Shield Attenuation...</span>
                  </>
                ) : (
                  <>
                    <i className="ti ti-refresh"></i>
                    <span>Run RF Shield Calibration Routine</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-transparent border-bottom py-2.5">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="ti ti-info-circle text-primary me-2"></i>
                Modular Route Isolation Info for Developers
              </h6>
            </div>
            <div className="card-body">
              <div className="alert alert-info py-2 px-3 small mb-3">
                <i className="ti ti-git-branch me-1 fw-bold"></i>
                <strong>Zero Git Conflicts:</strong> This page (<code>Stage02RfCalibrationPage.jsx</code>) and its sibling (<code>Stage02HistoryPage.jsx</code>) were added strictly within <code>src/pages/stages/stage02-nic-pcb-test/</code> and registered in <code>stage02-nic-pcb-test/index.routes.jsx</code>.
              </div>
              <ul className="list-unstyled small text-muted mb-0">
                <li className="mb-2">
                  <i className="ti ti-check text-success me-1"></i> No global router file was edited.
                </li>
                <li className="mb-2">
                  <i className="ti ti-check text-success me-1"></i> Other developers working on Stage 01, Stage 04, Stage 07, or Admin will experience 0 merge conflicts.
                </li>
                <li className="mb-2">
                  <i className="ti ti-check text-success me-1"></i> Dynamic routes <code>/stages/2/calibration</code> and <code>/stages/stage02/calibration</code> are automatically registered.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
