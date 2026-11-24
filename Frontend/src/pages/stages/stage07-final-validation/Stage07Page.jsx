import React from 'react';
import { useStage07Validation } from '../../../hooks/stages/useStage07Validation';
import OpticalProbeHeadStatus from '../../../components/stages/stage07-final-validation/hardware/OpticalProbeHeadStatus';
import FirmwareVerifyCard from '../../../components/stages/stage07-final-validation/FirmwareVerifyCard';
import DlmsCommunicationLog from '../../../components/stages/stage07-final-validation/hardware/DlmsCommunicationLog';

export default function Stage07Page() {
  const {
    meterSerial,
    setMeterSerial,
    isTesting,
    probeConnected,
    relayState,
    rtcDrift,
    tamperCheck,
    lcdCheck,
    records,
    loadingRecords,
    logs,
    runValidation,
    toggleRelayManual,
    fetchRecords
  } = useStage07Validation();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      runValidation(meterSerial);
    }
  };

  const handleExportCsv = () => {
    let csv = "\uFEFFID,Meter Serial,Relay Test,RTC Drift,Tamper Status,Optical DLMS,Status,Timestamp\n";
    records.forEach((r, idx) => {
      csv += `${r.id || idx + 1},${r.meter_serial},${r.relay || 'PASS'},${r.rtc || '+0.03 ppm'},${r.tamper || 'SECURE'},${r.optical || 'PASS'},${r.status || 'PASS'},${r.time || 'N/A'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage07_Final_Validation_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="container-fluid px-0 pb-4">
      {/* Top Header Bar */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-check-circle text-primary"></i>
                  <span>Stage 07: Final Functional Validation Jig</span>
                </h1>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6 shadow-2xs">
                  Stage 07
                </span>
                <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                  <i className="ti ti-circle-check fs-6"></i> Station Active (Station-07)
                </span>
              </div>
              <p className="text-secondary mb-0 small">
                Final operational sign-off &bull; Bistable latching relay disconnector, RTC drift check, tamper sensor matrix, and DLMS optical loopback.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary btn-sm font-sans fw-semibold shadow-2xs"
                onClick={handleExportCsv}
              >
                <i className="ti ti-file-spreadsheet me-1 text-success"></i> Export CSV
              </button>
              <button
                className={`btn px-4 py-2 fw-bold shadow-sm ${isTesting ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => runValidation(meterSerial || 'ZM-MTR-2026-9001')}
                disabled={isTesting}
              >
                <i className={`ti ${isTesting ? 'ti-loader spin' : 'ti-player-play'} me-1`}></i>
                {isTesting ? 'Validating Circuits...' : 'Start Full Validation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {/* Left Column: Barcode Scan & Functional Checks */}
        <div className="col-lg-7">
          {/* Barcode Scanner Input */}
          <div className="card shadow-sm border-0 bg-white mb-3">
            <div className="card-header bg-white border-bottom py-2">
              <span className="fw-bold text-dark">
                <i className="ti ti-scan text-primary me-1"></i> Scan Meter Barcode
              </span>
            </div>
            <div className="card-body p-3">
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="ti ti-barcode"></i></span>
                <input
                  type="text"
                  className="form-control font-monospace fw-bold text-primary"
                  placeholder="Scan Meter Serial (e.g. ZM-MTR-2026-9001)..."
                  value={meterSerial}
                  onChange={(e) => setMeterSerial(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isTesting}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-bold"
                  onClick={() => runValidation(meterSerial)}
                  disabled={isTesting || !meterSerial.trim()}
                >
                  <i className="ti ti-bolt me-1"></i> Run Test
                </button>
              </div>
            </div>
          </div>

          {/* Optical Probe Head Status */}
          <OpticalProbeHeadStatus connected={probeConnected} />

          {/* Functional Checks Card */}
          <FirmwareVerifyCard
            relayState={relayState}
            rtcDrift={rtcDrift}
            tamperCheck={tamperCheck}
            lcdCheck={lcdCheck}
            onToggleRelay={toggleRelayManual}
            isTesting={isTesting}
          />
        </div>

        {/* Right Column: DLMS Telemetry Logs */}
        <div className="col-lg-5">
          <DlmsCommunicationLog logs={logs} />
        </div>
      </div>

      {/* Verification History Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 07 Validation History
            </h6>
            <small className="text-secondary">Recent functional validation tests completed in current shift</small>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={fetchRecords}
            disabled={loadingRecords}
          >
            <i className={`ti ti-refresh me-1 ${loadingRecords ? 'ti-spin' : ''}`}></i> Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
            <thead className="table-light">
              <tr>
                <th scope="col" style={{ width: '50px' }}>#</th>
                <th scope="col">Meter Serial Number</th>
                <th scope="col">Relay Latch</th>
                <th scope="col">RTC Drift</th>
                <th scope="col">Tamper Matrix</th>
                <th scope="col">Optical DLMS</th>
                <th scope="col">Result</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {records.map((r, idx) => (
                <tr key={idx}>
                  <td>#{r.id || idx + 1}</td>
                  <td className="fw-bold text-dark">{r.meter_serial}</td>
                  <td>
                    <span className="badge bg-success-subtle text-success border border-success">
                      {r.relay || 'PASS'}
                    </span>
                  </td>
                  <td>{r.rtc || '+0.03 ppm'}</td>
                  <td>
                    <span className="badge bg-info-subtle text-info border border-info">
                      {r.tamper || 'SECURE'}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-success-subtle text-success border border-success">
                      {r.optical || 'PASS'}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-success text-white">
                      {r.status || 'PASS'}
                    </span>
                  </td>
                  <td className="text-muted">{r.time || '10:15 AM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
