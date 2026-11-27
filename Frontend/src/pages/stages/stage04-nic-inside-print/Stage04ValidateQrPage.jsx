import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Default 8 demo channels with pure numeric NIC Sr No (no NIC-ZM- prefix)
const DEFAULT_DEMO_CHANNELS = [
  { ch: 1, imei: '863906069415294', nic_sr_no: '863906069415294', st: 'PASS' },
  { ch: 2, imei: '863906069415295', nic_sr_no: '863906069415295', st: 'PASS' },
  { ch: 3, imei: '863906069415296', nic_sr_no: '863906069415296', st: 'PASS' },
  { ch: 4, imei: '863906069415297', nic_sr_no: '863906069415297', st: 'PASS' },
  { ch: 5, imei: '863906069415298', nic_sr_no: '863906069415298', st: 'PASS' },
  { ch: 6, imei: '863906069415299', nic_sr_no: '863906069415299', st: 'PASS' },
  { ch: 7, imei: '863906069415300', nic_sr_no: '863906069415300', st: 'PASS' },
  { ch: 8, imei: '863906069415301', nic_sr_no: '863906069415301', st: 'PASS' }
];

export default function Stage04ValidateQrPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Helper to extract clean numeric NIC Sr No without NIC-ZM- prefix
  const getCleanNicSrNo = (c) => {
    if (!c) return '';
    const raw = c.nic_sr_no || c.nic_uuid || c.imei || '';
    return String(raw).replace(/^NIC-ZM-/i, '').trim();
  };

  const getCleanImei = (c) => {
    if (!c) return '';
    return String(c.imei || '').trim();
  };

  // Load passed state or session storage cache
  const [cycleData, setCycleData] = useState(() => {
    if (location.state && location.state.activeChannels && location.state.activeChannels.length > 0) {
      return {
        cycleUuid: location.state.cycleUuid || 'CYC-' + Date.now().toString().slice(-6),
        channels: location.state.activeChannels,
        workId: location.state.workId || 'WORK-STG4-001',
        batchNo: location.state.batchNo || 'BATCH-2026-01'
      };
    }
    try {
      const stored = sessionStorage.getItem('zenmeter_stage04_active_validation');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.activeChannels && parsed.activeChannels.length > 0) {
          return {
            cycleUuid: parsed.cycleUuid || 'CYC-' + Date.now().toString().slice(-6),
            channels: parsed.activeChannels,
            workId: parsed.workId || 'WORK-STG4-001',
            batchNo: parsed.batchNo || 'BATCH-2026-01'
          };
        }
      }
    } catch (e) {}

    return {
      cycleUuid: 'DEMO-CYC-575',
      channels: DEFAULT_DEMO_CHANNELS,
      workId: 'WORK-STG4-001',
      batchNo: 'BATCH-2026-01'
    };
  });

  // Separate scan inputs and validation states for NIC SR No and IMEI
  const [scannedNic, setScannedNic] = useState({});
  const [scannedImei, setScannedImei] = useState({});
  const [nicStatus, setNicStatus] = useState({});
  const [imeiStatus, setImeiStatus] = useState({});

  // Input refs for auto-advancing cursor
  const inputRefs = useRef({});

  // Eligible channels
  const validChannels = (cycleData.channels || []).filter(c => {
    return c && (c.st === 'PASS' || c.st === 'CON' || c.imei);
  });

  // Focus the first scan input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (validChannels.length > 0) {
        const firstCh = validChannels[0].ch;
        if (inputRefs.current[`${firstCh}_nic`]) {
          inputRefs.current[`${firstCh}_nic`].focus();
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [validChannels.length]);

  // Overall metric calculations
  const totalChannels = validChannels.length;
  const fullyVerifiedChannels = validChannels.filter(
    c => nicStatus[c.ch] === 'MATCHED' && imeiStatus[c.ch] === 'MATCHED'
  );
  const totalVerifiedCount = fullyVerifiedChannels.length;
  const isAllVerified = totalChannels > 0 && totalVerifiedCount === totalChannels;

  const totalMismatches = validChannels.filter(
    c => nicStatus[c.ch] === 'MISMATCH' || imeiStatus[c.ch] === 'MISMATCH'
  ).length;

  // Handle Scan for NIC SR No
  const handleNicScanInput = (c, idx, value) => {
    const chNo = c.ch;
    setScannedNic(prev => ({ ...prev, [chNo]: value }));
    const trimmed = value.trim();

    if (!trimmed) {
      setNicStatus(prev => ({ ...prev, [chNo]: null }));
      return;
    }

    let parsedVal = trimmed.replace(/^NIC-ZM-/i, '').trim();
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        parsedVal = String(parsed.nic_sr_no || parsed.nic_uuid || parsed.imei_no || parsed.imei || trimmed).replace(/^NIC-ZM-/i, '').trim();
      }
    } catch (e) {}

    const targetNic = getCleanNicSrNo(c);
    const isMatch = parsedVal === targetNic || trimmed.includes(targetNic);

    if (isMatch) {
      setNicStatus(prev => ({ ...prev, [chNo]: 'MATCHED' }));
      // Advance cursor to IMEI input for the same channel!
      setTimeout(() => {
        if (inputRefs.current[`${chNo}_imei`]) {
          inputRefs.current[`${chNo}_imei`].focus();
        }
      }, 90);
    } else {
      setNicStatus(prev => ({ ...prev, [chNo]: 'MISMATCH' }));
    }
  };

  // Handle Scan for IMEI
  const handleImeiScanInput = (c, idx, value) => {
    const chNo = c.ch;
    setScannedImei(prev => ({ ...prev, [chNo]: value }));
    const trimmed = value.trim();

    if (!trimmed) {
      setImeiStatus(prev => ({ ...prev, [chNo]: null }));
      return;
    }

    let parsedVal = trimmed;
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        parsedVal = String(parsed.imei_no || parsed.imei || trimmed).trim();
      }
    } catch (e) {}

    const targetImei = getCleanImei(c);
    const isMatch = parsedVal === targetImei || trimmed.includes(targetImei);

    if (isMatch) {
      setImeiStatus(prev => ({ ...prev, [chNo]: 'MATCHED' }));
      // Advance cursor to the next channel's NIC SR No input!
      const nextChannel = validChannels[idx + 1];
      if (nextChannel) {
        setTimeout(() => {
          if (inputRefs.current[`${nextChannel.ch}_nic`]) {
            inputRefs.current[`${nextChannel.ch}_nic`].focus();
          }
        }, 90);
      }
    } else {
      setImeiStatus(prev => ({ ...prev, [chNo]: 'MISMATCH' }));
    }
  };

  // Keyboard navigation on Enter key
  const handleKeyDown = (e, nextRefKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRefKey && inputRefs.current[nextRefKey]) {
        inputRefs.current[nextRefKey].focus();
      }
    }
  };

  // Reset all scanned inputs
  const handleResetAllScans = () => {
    setScannedNic({});
    setScannedImei({});
    setNicStatus({});
    setImeiStatus({});
    if (validChannels.length > 0) {
      const firstCh = validChannels[0].ch;
      if (inputRefs.current[`${firstCh}_nic`]) {
        inputRefs.current[`${firstCh}_nic`].focus();
      }
    }
  };

  // Auto-validate all channels at once
  const handleAutoValidateAll = () => {
    const newScannedNic = {};
    const newScannedImei = {};
    const newNicStatus = {};
    const newImeiStatus = {};

    validChannels.forEach(c => {
      const targetNic = getCleanNicSrNo(c);
      const targetImei = getCleanImei(c);
      newScannedNic[c.ch] = targetNic;
      newScannedImei[c.ch] = targetImei;
      newNicStatus[c.ch] = 'MATCHED';
      newImeiStatus[c.ch] = 'MATCHED';
    });

    setScannedNic(newScannedNic);
    setScannedImei(newScannedImei);
    setNicStatus(newNicStatus);
    setImeiStatus(newImeiStatus);
  };

  // Load demo batch
  const handleLoadDemoBatch = () => {
    setCycleData({
      cycleUuid: 'DEMO-CYC-' + Math.floor(100 + Math.random() * 900),
      channels: DEFAULT_DEMO_CHANNELS,
      workId: 'WORK-STG4-001',
      batchNo: 'BATCH-2026-01'
    });
    setScannedNic({});
    setScannedImei({});
    setNicStatus({});
    setImeiStatus({});
    setTimeout(() => {
      if (inputRefs.current['1_nic']) {
        inputRefs.current['1_nic'].focus();
      }
    }, 150);
  };

  return (
    <div className="container-fluid py-3 px-3 px-md-4">
      {/* Print Styles for Verification Output */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            .sidebar, .navbar, .top-header, .no-print, header, .btn, .breadcrumb {
              display: none !important;
            }
            .container-fluid {
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
            #printable-nic-verification-grid {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              grid-gap: 12px !important;
              page-break-inside: avoid;
            }
            .card {
              border: 1px solid #0f172a !important;
              box-shadow: none !important;
              break-inside: avoid;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
          }
        `
      }} />

      {/* Top Header Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-3 bg-white no-print">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h5 className="fs-5 fw-bold text-dark mb-0">
              Validate NIC Card Serial & IMEI Numbers
            </h5>

            <button
              type="button"
              onClick={() => navigate('/stages/4')}
              className="btn btn-outline-secondary btn-sm fw-bold d-inline-flex align-items-center px-3 py-1.5 shadow-2xs"
              title="Return to Stage 4 Jig Execution"
            >
              <i className="ti ti-arrow-left me-1 fs-6"></i>
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Validation Console */}
      <div className="card border-0 shadow-sm rounded-3 bg-white">
        <div className="card-body p-3 p-md-3.5">
          {validChannels.length === 0 ? (
            <div className="text-center py-5 text-muted border rounded-3 bg-light">
              <i className="ti ti-scan fs-1 d-block mb-2 text-warning opacity-75"></i>
              <h5 className="fw-bold text-dark mb-1">No Channels Ready for Validation</h5>
              <p className="small mb-3 text-secondary" style={{ maxWidth: '480px', margin: '0 auto' }}>
                Run a Jig test in Stage 4 or load the demo test batch to validate channel serial numbers.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                onClick={handleLoadDemoBatch}
              >
                <i className="ti ti-player-play me-1"></i> Load Demo Batch (8 Channels)
              </button>
            </div>
          ) : (
            <div>
              {/* 2 Rows × 4 Columns Grid (8 Channels) */}
              <div id="printable-nic-verification-grid" className="row g-2.5">
                {validChannels.map((c, idx) => {
                  const nicSrNo = getCleanNicSrNo(c);
                  const imeiNo = getCleanImei(c);

                  const isNicMatched = nicStatus[c.ch] === 'MATCHED';
                  const isNicMismatch = nicStatus[c.ch] === 'MISMATCH';

                  const isImeiMatched = imeiStatus[c.ch] === 'MATCHED';
                  const isImeiMismatch = imeiStatus[c.ch] === 'MISMATCH';

                  const isCardVerified = isNicMatched && isImeiMatched;
                  const isCardMismatch = isNicMismatch || isImeiMismatch;

                  // Next ref key for keyboard Enter navigation
                  const nextChannel = validChannels[idx + 1];
                  const nextNicKey = nextChannel ? `${nextChannel.ch}_nic` : null;

                  return (
                    <div key={c.ch} className="col-12 col-sm-6 col-lg-3">
                      <div
                        className={`card h-100 transition-all ${
                          isCardVerified
                            ? 'border-success border-2 shadow-xs'
                            : isCardMismatch
                            ? 'border-danger border-2 shadow-xs'
                            : 'border-secondary-subtle shadow-2xs'
                        }`}
                        style={{
                          borderRadius: '10px',
                          backgroundColor: isCardVerified ? '#f0fdf4' : isCardMismatch ? '#fef2f2' : '#ffffff'
                        }}
                      >
                        {/* Compact Card Header */}
                        <div
                          className="card-header px-2.5 py-1.5 d-flex justify-content-between align-items-center"
                          style={{
                            backgroundColor: isCardVerified ? '#dcfce7' : isCardMismatch ? '#fee2e2' : '#f8fafc',
                            borderBottom: isCardVerified ? '1px solid #bbf7d0' : isCardMismatch ? '1px solid #fecaca' : '1px solid #e2e8f0',
                            borderTopLeftRadius: '9px',
                            borderTopRightRadius: '9px'
                          }}
                        >
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              className={`badge ${
                                isCardVerified ? 'bg-success' : 'bg-primary'
                              } text-white font-mono px-2 py-0.5 rounded fw-bold text-2xs`}
                            >
                              CH {String(c.ch).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Verification State Badge */}
                          {isCardVerified ? (
                            <span className="badge bg-success text-white font-mono text-2xs px-1.5 py-0.5 fw-bold d-flex align-items-center gap-1 shadow-2xs">
                              <i className="ti ti-check"></i> VERIFIED
                            </span>
                          ) : isCardMismatch ? (
                            <span className="badge bg-danger text-white font-mono text-2xs px-1.5 py-0.5 fw-bold d-flex align-items-center gap-1 shadow-2xs">
                              <i className="ti ti-alert-triangle"></i> MISMATCH
                            </span>
                          ) : (isNicMatched || isImeiMatched) ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle font-mono text-3xs px-1.5 py-0.5 fw-bold">
                              1 / 2 MATCHED
                            </span>
                          ) : null}
                        </div>

                        {/* Card Body */}
                        <div className="card-body p-2.5 d-flex flex-column justify-content-between gap-2">
                          {/* SECTION 1: NIC SR NO */}
                          <div>
                            {/* NIC SR No Display */}
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-secondary fw-semibold text-2xs">
                                NIC SR No:
                              </span>
                              <span className="fw-bold text-primary font-mono text-2xs text-truncate" title={nicSrNo}>
                                {nicSrNo || '-'}
                              </span>
                            </div>

                            {/* Scan Check Input for NIC */}
                            <div className="text-start no-print">
                              <input
                                ref={el => (inputRefs.current[`${c.ch}_nic`] = el)}
                                type="text"
                                className={`form-control form-control-sm font-mono text-2xs px-2.5 rounded-2 ${
                                  isNicMatched
                                    ? 'border-success bg-white fw-bold'
                                    : isNicMismatch
                                    ? 'border-danger bg-white fw-bold'
                                    : 'border-secondary-subtle'
                                }`}
                                style={{
                                  height: '30px',
                                  color: isNicMismatch ? '#dc2626' : isNicMatched ? '#16a34a' : '#1e293b'
                                }}
                                placeholder="Scan NIC Sr No..."
                                value={scannedNic[c.ch] || ''}
                                onChange={(e) => handleNicScanInput(c, idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, `${c.ch}_imei`)}
                              />
                            </div>
                          </div>

                          <div className="border-top border-light-subtle my-0.5"></div>

                          {/* SECTION 2: IMEI NUMBER */}
                          <div>
                            {/* IMEI Display */}
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-secondary fw-semibold text-2xs">
                                IMEI No:
                              </span>
                              <span className="fw-bold text-dark font-mono text-2xs text-truncate" title={imeiNo}>
                                {imeiNo || '-'}
                              </span>
                            </div>

                            {/* Scan Check Input for IMEI */}
                            <div className="text-start no-print">
                              <input
                                ref={el => (inputRefs.current[`${c.ch}_imei`] = el)}
                                type="text"
                                className={`form-control form-control-sm font-mono text-2xs px-2.5 rounded-2 ${
                                  isImeiMatched
                                    ? 'border-success bg-white fw-bold'
                                    : isImeiMismatch
                                    ? 'border-danger bg-white fw-bold'
                                    : 'border-secondary-subtle'
                                }`}
                                style={{
                                  height: '30px',
                                  color: isImeiMismatch ? '#dc2626' : isImeiMatched ? '#16a34a' : '#1e293b'
                                }}
                                placeholder="Scan IMEI..."
                                value={scannedImei[c.ch] || ''}
                                onChange={(e) => handleImeiScanInput(c, idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, nextNicKey)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
