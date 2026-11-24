import React from 'react';

export default function QCReportsPage() {
  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-chart-pie text-primary me-2"></i> Quality Assurance Analytics & Reports
          </h4>
          <p className="text-secondary small mb-0">
            Yield rate analysis, defect Pareto breakdown, inspection throughput, and shift QA scorecards.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">First Pass Yield (FPY)</span>
              <h2 className="fw-bold text-success mb-1">98.4%</h2>
              <span className="badge bg-success-subtle text-success small">
                <i className="ti ti-trending-up me-1"></i> +0.6% vs target
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Total Inspected Today</span>
              <h2 className="fw-bold text-dark mb-1">1,248</h2>
              <span className="badge bg-primary-subtle text-primary small">
                <i className="ti ti-check me-1"></i> 1,228 Passed
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Quarantine Hold</span>
              <h2 className="fw-bold text-warning mb-1">14</h2>
              <span className="badge bg-warning-subtle text-warning small">
                <i className="ti ti-hourglass me-1"></i> Under Review
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Scrap / Reject Count</span>
              <h2 className="fw-bold text-danger mb-1">6</h2>
              <span className="badge bg-danger-subtle text-danger small">
                <i className="ti ti-trash me-1"></i> 0.48% Defect Rate
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 text-dark">Defect Taxonomy Pareto Distribution</h6>
            </div>
            <div className="card-body p-3">
              <ul className="list-group list-group-flush small">
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span>Optical Handshake Timeout</span>
                  <span className="badge bg-danger">45%</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span>Laser Etch Borderline Contrast</span>
                  <span className="badge bg-warning text-dark">25%</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span>Enclosure Seal Flange Scratch</span>
                  <span className="badge bg-info">18%</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span>Metrology Calibration Drift</span>
                  <span className="badge bg-secondary">12%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 text-dark">Stage-by-Stage Quality Compliance</h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Stage 04: NIC Jig & Barcode Scan</span>
                  <span className="text-success">99.2%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success" style={{ width: '99.2%' }}></div>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Stage 06: Automatic Calibration</span>
                  <span className="text-primary">97.8%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-primary" style={{ width: '97.8%' }}></div>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between small fw-semibold mb-1">
                  <span>Stage 09: Meter Box Laser Print & Optical</span>
                  <span className="text-info">98.5%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-info" style={{ width: '98.5%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
