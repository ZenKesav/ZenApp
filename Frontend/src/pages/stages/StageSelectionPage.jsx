import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';

export default function StageSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const stagesList = [
    { id: 1, name: 'Stage 01: PCB Code Loading', path: '/stages/1', desc: 'Hex/Bin Flashing, JTAG/SWD Debugger & Checksum Verification', icon: 'ti-cpu', badge: 'Active' },
    { id: 2, name: 'Stage 02: NIC PCB Test', path: '/stages/2', desc: 'Pneumatic RF Shield Box, AT Command & Cellular Telemetry', icon: 'ti-wifi', badge: 'Active' },
    { id: 4, name: 'Stage 04: NIC Inside Print', path: '/stages/4', desc: 'Zebra Barcode Scanner, Dual Jig Clamp & Thermal ZPL Label Print', icon: 'ti-printer', badge: 'Active' },
    { id: 6, name: 'Stage 06: Calibration & Accuracy', path: '/stages/6', desc: '230V 5A Reference Source Sync, Error Gauge & Class 1.0 Cert', icon: 'ti-gauge', badge: 'Active' },
    { id: 7, name: 'Stage 07: Final Validation Jig', path: '/stages/7', desc: 'Optical Probe Communication, Relay Disconnect & Tamper Matrix', icon: 'ti-checkup-list', badge: 'Active' },
    { id: 8, name: 'Stage 08: PVC Security Seal Tag', path: '/stages/8', desc: 'Ultrasonic Housing Weld, Dual Seal Barcode Match & Tamper Audit', icon: 'ti-lock-square', badge: 'Active' },
    { id: 9, name: 'Stage 09: Meter Box Laser Print', path: '/stages/9', desc: 'Laser Enclosure Marking, Optical Port DLMS & IS 16444 Verification', icon: 'ti-barcode', badge: 'Active' },
    { id: 10, name: 'Stage 10: Carton Packaging', path: '/stages/10', desc: 'Weight Scale Validation (485g ±15g), Item Checklist & ZPL Label', icon: 'ti-package', badge: 'Active' },
    { id: 11, name: 'Stage 11: Master Carton Pallet', path: '/stages/11', desc: '10-Carton Aggregation, Pallet Platform Scale & GS1 Shipping Label', icon: 'ti-truck-delivery', badge: 'Active' },
  ];

  const handleSelectStage = (path) => {
    navigate(path, { replace: true });
  };

  return (
    <div className="min-vh-100 w-100 bg-light d-flex flex-column justify-content-between p-3 p-md-4 p-lg-5" style={{ backgroundColor: '#f8fafc' }}>
      <div>
        {/* Top Header Bar */}
        <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <h4 className="fw-bold text-primary mb-0 font-monospace">ZENMETER &bull; MES</h4>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-none d-sm-inline">
              Production Stage Selector
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-sm-flex flex-column text-end lh-tight">
              <span className="fw-bold text-dark small">{user?.name || user?.user_name || 'Zenmeter Operator'}</span>
              <small className="text-muted text-xs font-mono">
                {user?.employee_id || 'EMP-001'} &bull; Shift A
              </small>
            </div>
            <button
              className="btn btn-outline-danger btn-sm fw-semibold d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-3 shadow-xs"
              onClick={logout}
              title="Logout of account"
            >
              <i className="ti ti-logout fs-6"></i>
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="mx-auto" style={{ maxWidth: '1280px' }}>
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 text-white" style={{ backgroundColor: '#0f172a' }}>
            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge px-3 py-1 font-mono text-uppercase" style={{ backgroundColor: '#fef08a', color: '#854d0e', fontWeight: 'bold', fontSize: '0.75rem' }}>
                      {user?.role || 'OPERATOR'}
                    </span>
                    <span className="badge bg-secondary-subtle text-light font-mono px-3 py-1">
                      {user?.employee_id || 'EMP-001'}
                    </span>
                  </div>
                  <h3 className="fw-bold mb-1">Select Active Production Stage</h3>
                  <p className="text-slate-300 small mb-0">
                    Choose your designated line station to begin meter assembly, automated testing, or packaging verification.
                  </p>
                </div>
                <div>
                  <button className="btn btn-light btn-sm fw-bold px-3 py-2" onClick={() => navigate('/analysis/dashboard')}>
                    <i className="ti ti-layout-dashboard me-1"></i> Go to Executive Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stage Cards Grid */}
          <div className="row g-3">
            {stagesList.map((stg) => (
              <div key={stg.id} className="col-12 col-md-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm rounded-3 h-100 transition-all cursor-pointer hover-shadow"
                  onClick={() => handleSelectStage(stg.path)}
                  style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div className="card-body p-3.5 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono">
                          STAGE {stg.id < 10 ? `0${stg.id}` : stg.id}
                        </span>
                        <span className="badge bg-success-subtle text-success">{stg.badge}</span>
                      </div>
                      <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <i className={`ti ${stg.icon} text-primary fs-5`}></i>
                        {stg.name}
                      </h6>
                      <p className="text-muted small mb-3" style={{ minHeight: '38px' }}>
                        {stg.desc}
                      </p>
                    </div>
                    <button className="btn btn-outline-primary btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5">
                      <span>Open Station</span>
                      <i className="ti ti-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-muted small py-3 mt-4 border-top">
        Zenmeter Smart Energy Systems &bull; Modular Distributed MES Architecture
      </div>
    </div>
  );
}
