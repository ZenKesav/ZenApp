import React, { useState } from 'react';

export default function LaserMarkingCanvas({ printSpecs, sessionActive }) {
  const [viewMode, setViewMode] = useState('actual'); // 'actual' | 'cad' | 'blueprint'

  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-layout-dashboard text-primary fs-4"></i>
          <span className="fw-bold text-dark">Meter Front Plate - Laser Preview</span>
        </div>
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${viewMode === 'actual' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('actual')}
          >
            Actual Print
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'cad' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('cad')}
          >
            CAD Wireframe
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'blueprint' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('blueprint')}
          >
            Blueprint
          </button>
        </div>
      </div>
      <div className="card-body p-4 text-center">
        <div
          className={`mx-auto rounded border position-relative p-4 transition-all ${
            viewMode === 'cad'
              ? 'bg-dark text-info border-info font-monospace'
              : viewMode === 'blueprint'
              ? 'bg-primary text-white border-white'
              : 'bg-light text-dark border-secondary-subtle'
          }`}
          style={{
            maxWidth: '520px',
            minHeight: '360px',
            boxShadow: sessionActive ? '0 0 25px rgba(220, 53, 69, 0.4)' : '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          {sessionActive && (
            <div
              className="position-absolute top-0 start-0 w-100 bg-danger text-white py-1 small fw-bold text-uppercase"
              style={{ letterSpacing: '2px' }}
            >
              <i className="ti ti-laser me-1"></i> Laser Beam Firing...
            </div>
          )}

          {/* Logo & Brand */}
          <div className="text-center mt-2 mb-3">
            <h4 className="fw-bold mb-0 text-uppercase tracking-wide">
              {printSpecs.brandTitle || 'ZENMETER'}
            </h4>
            <div className="small opacity-75">{printSpecs.category}</div>
          </div>

          {/* Meter Specification Grid */}
          <div className="border rounded p-2 mb-3 bg-opacity-25 bg-secondary text-start small">
            <div className="row g-1">
              <div className="col-6"><strong>Voltage/Current:</strong> {printSpecs.voltageCurrent}</div>
              <div className="col-6"><strong>Accuracy:</strong> {printSpecs.accuracyClass}</div>
              <div className="col-6"><strong>Standard:</strong> {printSpecs.meterType}</div>
              <div className="col-6"><strong>Constant:</strong> {printSpecs.pulseConstant}</div>
              <div className="col-6"><strong>Property Of:</strong> {printSpecs.propertyOf}</div>
              <div className="col-6"><strong>Mfg Date:</strong> {printSpecs.mfgDate}</div>
              <div className="col-12"><strong>LOA No:</strong> {printSpecs.loaNo}</div>
            </div>
          </div>

          {/* Laser Burned Serial & Barcodes */}
          <div className="border border-2 border-dashed rounded p-3 mb-2 bg-white text-dark">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-start">
                <div className="small text-secondary fw-semibold">METER SERIAL NUMBER</div>
                <div className="fs-4 fw-bold font-monospace text-primary">
                  {printSpecs.serialNo || 'ZM-XXXXXXXX'}
                </div>
                <div className="small text-muted font-monospace mt-1">
                  IMEI: {printSpecs.imei || '86XXXXXXXXXXXXX'}
                </div>
                <div className="small text-muted font-monospace">
                  NIC: {printSpecs.nicSrNo || 'NIC-ZM-XXXXXX'}
                </div>
              </div>
              <div className="border p-2 rounded text-center bg-light" style={{ width: '80px', height: '80px' }}>
                <i className="ti ti-qrcode fs-1 text-dark d-block"></i>
                <span style={{ fontSize: '9px' }}>QR Code</span>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center small text-secondary mt-3">
            <span>Laser Calibrated: 20W Fiber</span>
            <span>Scale: 1:1 Actual Enclosure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
