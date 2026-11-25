import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';
import { getUserAssignedStages, isFullAccessUser, saveStageForUser } from '../../utils/stageUtils';

export default function StageSelectionPage() {
  const navigate = useNavigate();
  const { user, logout, currentShift, setSelectedStageId } = useAuth();

  const isFullAccess = isFullAccessUser(user);
  const assignedStages = getUserAssignedStages(user);
  const assignedStageIdSet = new Set(
    assignedStages.map(s => Number(s.id || s.stage_number))
  );

  const stagesList = [
    {
      id: 1,
      name: 'Stage 01: PCB Code Loading',
      path: '/stages/1',
      desc: 'Hex/Bin Flashing, JTAG/SWD Debugger & Checksum Verification',
      icon: 'ti-cpu',
      badge: 'Active',
      lineType: 'Main Meter Assembly Line',
      stationId: 'Station-01'
    },
    {
      id: 2,
      name: 'Stage 02: NIC PCB Test',
      path: '/stages/2',
      desc: 'Pneumatic RF Shield Box, AT Command & Cellular Telemetry',
      icon: 'ti-wifi',
      badge: 'Active',
      lineType: 'NIC Card Preparation Line',
      stationId: 'Station-02'
    },
    {
      id: 4,
      name: 'Stage 04: NIC Inside Print',
      path: '/stages/4',
      desc: 'Zebra Barcode Scanner, Dual Jig Clamp & Thermal ZPL Label Print',
      icon: 'ti-printer',
      badge: 'Active',
      lineType: 'NIC Card Preparation Line',
      stationId: 'Station-04'
    },
    {
      id: 6,
      name: 'Stage 06: Calibration & Accuracy',
      path: '/stages/6',
      desc: '230V 5A Reference Source Sync, Error Gauge & Class 1.0 Cert',
      icon: 'ti-gauge',
      badge: 'Active',
      lineType: 'Main Meter Assembly Line',
      stationId: 'Station-06'
    },
    {
      id: 7,
      name: 'Stage 07: Final Validation Jig',
      path: '/stages/7',
      desc: 'Optical Probe Communication, Relay Disconnect & Tamper Matrix',
      icon: 'ti-checkup-list',
      badge: 'Active',
      lineType: 'Main Meter Assembly Line',
      stationId: 'Station-07'
    },
    {
      id: 8,
      name: 'Stage 08: PVC Security Seal Tag',
      path: '/stages/8',
      desc: 'Ultrasonic Housing Weld, Dual Seal Barcode Match & Tamper Audit',
      icon: 'ti-lock-square',
      badge: 'Active',
      lineType: 'Main Meter Assembly Line',
      stationId: 'Station-08'
    },
    {
      id: 9,
      name: 'Stage 09: Meter Box Laser Print',
      path: '/stages/9',
      desc: 'Laser Enclosure Marking, Optical Port DLMS & IS 16444 Verification',
      icon: 'ti-barcode',
      badge: 'Active',
      lineType: 'NIC Card Preparation Line',
      stationId: 'Station-09'
    },
    {
      id: 10,
      name: 'Stage 10: Carton Packaging',
      path: '/stages/10',
      desc: 'Weight Scale Validation (485g ±15g), Item Checklist & ZPL Label',
      icon: 'ti-package',
      badge: 'Active',
      lineType: 'NIC Card Preparation Line',
      stationId: 'Station-10'
    },
    {
      id: 11,
      name: 'Stage 11: Master Carton Pallet',
      path: '/stages/11',
      desc: '10-Carton Aggregation, Pallet Platform Scale & GS1 Shipping Label',
      icon: 'ti-truck-delivery',
      badge: 'Active',
      lineType: 'NIC Card Preparation Line',
      stationId: 'Station-11'
    },
  ];

  // For operators and supervisors: ONLY show the stages assigned in Admin User Management!
  const visibleStages = isFullAccess
    ? stagesList
    : stagesList.filter(stg => assignedStageIdSet.has(stg.id));

  const handleSelectStage = (stg) => {
    saveStageForUser(user, stg.id);
    if (setSelectedStageId) {
      setSelectedStageId(stg.id);
    }
    navigate(stg.path, { replace: true });
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
                {user?.employee_id || 'EMP-001'} &bull; {currentShift?.shift_name || currentShift?.name || 'Shift A'}
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
                    <span className="badge bg-success-subtle text-success font-mono px-3 py-1">
                      {visibleStages.length} Assigned {visibleStages.length === 1 ? 'Stage' : 'Stages'}
                    </span>
                  </div>
                  <h3 className="fw-bold mb-1">
                    {isFullAccess ? 'Factory Production Stage Selector' : `Assigned Factory Stages (${visibleStages.length})`}
                  </h3>
                  <p className="text-slate-300 small mb-0">
                    {isFullAccess
                      ? 'Administrator view: Full factory access to all active production stations.'
                      : `Select from your assigned production line stages below to begin meter assembly, testing, or packaging.`
                    }
                  </p>
                </div>
                {isFullAccess && (
                  <div>
                    <button className="btn btn-light btn-sm fw-bold px-3 py-2" onClick={() => navigate('/analysis/dashboard')}>
                      <i className="ti ti-layout-dashboard me-1"></i> Go to Executive Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* If No Stages Assigned */}
          {visibleStages.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
              <div className="mb-3">
                <i className="ti ti-lock-access text-warning display-4"></i>
              </div>
              <h4 className="fw-bold text-dark mb-2">No Production Stages Assigned</h4>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '520px' }}>
                Your operator account (<strong>{user?.employee_id || user?.name}</strong>) is currently active, but an administrator has not assigned any production stages to you yet.
              </p>
              <div className="alert alert-warning d-inline-block small mb-0 py-2.5 px-4 rounded-3 border-0">
                <i className="ti ti-info-circle me-1.5"></i>
                Please contact your System Administrator (Admin IT) to assign your production stages.
              </div>
            </div>
          ) : (
            /* Stage Cards Grid */
            <div className="row g-3">
              {visibleStages.map((stg, index) => (
                <div key={stg.id} className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card border-0 shadow-sm rounded-3 h-100 transition-all cursor-pointer hover-shadow"
                    onClick={() => handleSelectStage(stg)}
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
                        <p className="text-muted small mb-2" style={{ minHeight: '38px' }}>
                          {stg.desc}
                        </p>
                        <div className="d-flex align-items-center gap-2 text-muted x-small mb-3 font-mono border-top pt-2">
                          <span className="text-truncate">
                            <i className="ti ti-layout-distribute-vertical me-1"></i>
                            {stg.lineType}
                          </span>
                          <span className="ms-auto badge bg-light text-secondary border">
                            {stg.stationId}
                          </span>
                        </div>
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
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-muted small py-3 mt-4 border-top">
        Zenmeter Smart Energy Systems &bull; Modular Distributed MES Architecture
      </div>
    </div>
  );
}
