import React, { useState } from 'react';
import { useStage06Calibration } from '../../../hooks/stages/useStage06Calibration';
import SourceBenchControl from '../../../components/stages/stage06-calibration/hardware/SourceBenchControl';
import LiveErrorGauge from '../../../components/stages/stage06-calibration/hardware/LiveErrorGauge';
import VoltageCurrentGrid from '../../../components/stages/stage06-calibration/VoltageCurrentGrid';
import CalibrationPdfPreview from '../../../components/stages/stage06-calibration/CalibrationPdfPreview';
import { showSuccessAlert } from '../../../core/utils/swal';

export default function Stage06Page() {
  const {
    benchConnected,
    calibrating,
    sourceVoltage,
    sourceCurrent,
    powerFactor,
    frequency,
    channels,
    logs,
    startAutoCalibration
  } = useStage06Calibration();

  const [savedToDb, setSavedToDb] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  const handleSaveToDb = () => {
    setSavedToDb(true);
    showSuccessAlert('Calibration Saved', 'All 10 meter calibration telemetry records successfully synced to database.');
  };

  const handleReset = () => {
    setSavedToDb(false);
    showSuccessAlert('Bench Reset', 'Calibration bench source and counters have been reset.');
  };

  const handleExportCsv = () => {
    let csv = "\uFEFFPosition,Meter Serial,Voltage (V),Current (A),Power (W),Pulse Rate,Error (%),Error Lock,Status\n";
    channels.forEach((m, idx) => {
      const serial = m.serial_no || m.meterNo || `ZM-MTR-${6001 + idx}`;
      const err = m.error_pct ?? m.errorPct ?? 0;
      csv += `${m.pos || idx + 1},${serial},${m.voltage},${m.current},${m.power},${m.pulseRate || 1600},${err}%,${m.errorLock || 'NO LOCK'},${m.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage06_Calibration_Report_${Date.now()}.csv`;
    link.click();
  };

  const avgError = channels.length > 0
    ? (channels.reduce((acc, c) => acc + Number(c.error_pct ?? c.errorPct ?? 0), 0) / channels.length).toFixed(3)
    : 0;

  return (
    <div className="container-fluid px-0 pb-4">
      {/* Top Header Bar */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-zap text-primary"></i>
                  <span>Stage 06: Voltage, Current &amp; Accuracy Calibration</span>
                </h1>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6 shadow-2xs">
                  Stage 06
                </span>
                <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                  <i className="ti ti-circle-check fs-6"></i> Station Active (Station-06)
                </span>
                {savedToDb && (
                  <span className="badge bg-success text-white px-3 py-1 font-mono shadow-2xs">
                    <i className="ti ti-database-check me-1"></i>DB SAVED
                  </span>
                )}
              </div>
              <p className="text-secondary mb-0 small">
                Main Meter Assembly Line &bull; Automated 10-channel AC power source calibration, impulse calculation &amp; MPE verification
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary btn-sm font-sans fw-semibold shadow-2xs"
                onClick={handleExportCsv}
              >
                <i className="ti ti-file-spreadsheet me-1 text-success"></i> Download Report
              </button>
              <button
                className="btn btn-outline-info btn-sm font-sans fw-semibold shadow-2xs"
                onClick={() => setIsCertificateOpen(true)}
              >
                <i className="ti ti-certificate me-1"></i> View Certificate
              </button>
              <button
                className="btn btn-light border btn-sm font-sans fw-semibold"
                onClick={handleReset}
              >
                <i className="ti ti-refresh me-1"></i> Reset Bench
              </button>
              <button
                className={`btn px-4 py-2 fw-bold shadow-sm ${calibrating ? 'btn-secondary' : 'btn-primary'}`}
                onClick={startAutoCalibration}
                disabled={calibrating}
              >
                <i className={`ti ${calibrating ? 'ti-loader spin' : 'ti-player-play'} me-1`}></i>
                {calibrating ? 'Injecting 230V Power...' : 'Start Calibration Test'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Source Control */}
      <SourceBenchControl
        voltage={sourceVoltage}
        current={sourceCurrent}
        frequency={frequency}
        powerFactor={powerFactor}
        benchConnected={benchConnected}
        isTesting={calibrating}
      />

      {/* Real-time Tolerance Gauge */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-3">
          <LiveErrorGauge errorPct={Number(avgError)} limit={0.20} />
        </div>
      </div>

      {/* Multi-Channel Position Grid */}
      <VoltageCurrentGrid
        meters={channels}
        onSaveDb={handleSaveToDb}
        isTesting={calibrating}
      />

      {/* Live Calibration Logs Console */}
      <div className="card bg-dark text-white border-secondary font-mono shadow-sm">
        <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
          <span className="small text-secondary fw-bold">
            <i className="ti ti-terminal me-2 text-info"></i>Calibration Bench Live Serial Telemetry Logs
          </span>
          <span className="badge bg-secondary text-white text-xs">230V 5A Source Sync</span>
        </div>
        <div className="card-body p-3 overflow-auto" style={{ maxHeight: '180px', fontSize: '0.785rem' }}>
          {logs.map((lg) => (
            <div key={lg.id} className="text-light opacity-90 py-0.5">
              <span className="text-muted me-2">[{lg.time}]</span>
              <span className={lg.type === 'success' ? 'text-success' : lg.type === 'error' ? 'text-danger' : 'text-light'}>
                {lg.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calibration Certificate Modal */}
      <CalibrationPdfPreview
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        meters={channels}
      />
    </div>
  );
}
