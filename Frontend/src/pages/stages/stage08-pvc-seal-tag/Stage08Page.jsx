import React from 'react';
import { useStage08SealTag } from '../../../hooks/stages/useStage08SealTag';
import LeftSealScannerWidget from '../../../components/stages/stage08-pvc-seal-tag/hardware/LeftSealScannerWidget';
import RightBodyScannerWidget from '../../../components/stages/stage08-pvc-seal-tag/hardware/RightBodyScannerWidget';
import SealMismatchWarning from '../../../components/stages/stage08-pvc-seal-tag/SealMismatchWarning';

export default function Stage08Page() {
  const {
    sealBarcode,
    setSealBarcode,
    meterSerial,
    setMeterSerial,
    isSealing,
    isWelded,
    isMismatch,
    mismatchReason,
    weldTemp,
    clampPressure,
    weldDuration,
    ultrasonicFrequency,
    records,
    loadingRecords,
    logs,
    triggerSealWeld,
    resetInputs,
    fetchRecords
  } = useStage08SealTag();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (sealBarcode && meterSerial && !isMismatch) {
        triggerSealWeld();
      }
    }
  };

  const handleExportCsv = () => {
    let csv = "\uFEFFID,Seal Barcode,Meter Serial,Weld Temp,Pneumatic Pressure,Status,Timestamp\n";
    records.forEach((r, idx) => {
      csv += `${r.id || idx + 1},${r.seal_barcode},${r.meter_serial},${r.weld_temp || '185°C'},${r.pressure || '4.2 bar'},${r.status || 'VERIFIED'},${r.time || 'N/A'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage08_PVC_Seal_Report_${Date.now()}.csv`;
    link.click();
  };

  const isReadyToWeld = Boolean(sealBarcode.trim() && meterSerial.trim() && !isMismatch);

  return (
    <div className="container-fluid px-0 pb-4">
      {/* Top Header Bar */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-shield-check text-primary"></i>
                  <span>Stage 08: PVC Security Seal &amp; Ultrasonic Welding</span>
                </h1>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6 shadow-2xs">
                  Stage 08
                </span>
                <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                  <i className="ti ti-circle-check fs-6"></i> Station Active (Station-08)
                </span>
                {isWelded && (
                  <span className="badge bg-success text-white px-3 py-1 font-mono shadow-2xs">
                    <i className="ti ti-check me-1"></i>WELD VERIFIED
                  </span>
                )}
              </div>
              <p className="text-secondary mb-0 small">
                Dual barcode matching &bull; Verification of tamper-evident security seal with laser-marked meter body &amp; pneumatic ultrasonic weld bonding.
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
                className="btn btn-light border btn-sm font-sans fw-semibold"
                onClick={resetInputs}
              >
                <i className="ti ti-refresh me-1"></i> Clear Station
              </button>
              <button
                className={`btn px-4 py-2 fw-bold shadow-sm ${!isReadyToWeld || isSealing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={triggerSealWeld}
                disabled={!isReadyToWeld || isSealing}
              >
                <i className={`ti ${isSealing ? 'ti-loader spin' : 'ti-flame'} me-1`}></i>
                {isSealing ? 'Ultrasonic Welding...' : 'Trigger Ultrasonic Weld'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mismatch Warning */}
      <SealMismatchWarning isMismatch={isMismatch} reason={mismatchReason} />

      {/* Dual Barcode Scanner Widgets */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <LeftSealScannerWidget
            value={sealBarcode}
            onChange={setSealBarcode}
            onKeyDown={handleKeyPress}
            disabled={isSealing}
          />
        </div>
        <div className="col-md-6">
          <RightBodyScannerWidget
            value={meterSerial}
            onChange={setMeterSerial}
            onKeyDown={handleKeyPress}
            disabled={isSealing}
          />
        </div>
      </div>

      {/* Ultrasonic Machine Telemetry & Log Console */}
      <div className="row g-3 mb-4">
        {/* Machine Parameters */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-cpu fs-4 text-primary me-2"></i>
                <h6 className="mb-0 fw-bold text-dark">Ultrasonic Welder Telemetry Parameters</h6>
              </div>
              <span className="badge bg-success-subtle text-success border border-success font-mono">
                PNEUMATICS OK
              </span>
            </div>
            <div className="card-body p-3">
              <div className="row g-3 font-mono">
                <div className="col-6">
                  <div className="card border-0 bg-primary-subtle p-3 rounded-3">
                    <span className="text-muted text-xs d-block">Weld Temperature</span>
                    <strong className="text-primary fs-4">{weldTemp} &deg;C</strong>
                    <small className="text-muted d-block text-2xs">Target: 180 - 190&deg;C</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card border-0 bg-info-subtle p-3 rounded-3">
                    <span className="text-muted text-xs d-block">Clamp Pressure</span>
                    <strong className="text-info-emphasis fs-4">{clampPressure.toFixed(1)} bar</strong>
                    <small className="text-muted d-block text-2xs">Regulated Air Line</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card border-0 bg-warning-subtle p-3 rounded-3">
                    <span className="text-muted text-xs d-block">Weld Duration</span>
                    <strong className="text-warning-emphasis fs-4">{weldDuration.toFixed(2)} s</strong>
                    <small className="text-muted d-block text-2xs">0.8s Cooling Dwell</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card border-0 bg-success-subtle p-3 rounded-3">
                    <span className="text-muted text-xs d-block">Generator Freq</span>
                    <strong className="text-success fs-4">{ultrasonicFrequency.toFixed(1)} kHz</strong>
                    <small className="text-muted d-block text-2xs">Titanium Booster Horn</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Welder Log Console */}
        <div className="col-lg-6">
          <div className="card bg-dark text-white border-secondary font-mono shadow-sm h-100">
            <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
              <span className="small text-secondary fw-bold">
                <i className="ti ti-terminal me-2 text-info"></i>Station 08 Ultrasonic Welder Live Console
              </span>
              <span className="badge bg-secondary text-white text-xs">Pneumatics Active</span>
            </div>
            <div className="card-body p-3 overflow-auto" style={{ maxHeight: '220px', fontSize: '0.785rem' }}>
              {logs.map((lg) => (
                <div key={lg.id} className="py-0.5 text-light opacity-90">
                  <span className="text-muted me-2">[{lg.time}]</span>
                  <span className={lg.type === 'success' ? 'text-success' : lg.type === 'error' ? 'text-danger' : 'text-light'}>
                    {lg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verified Seals History Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 08 Verified Seal History
            </h6>
            <small className="text-secondary">Recent ultrasonic security seal attachments in current shift</small>
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
                <th scope="col">PVC Seal Barcode</th>
                <th scope="col">Meter Body Serial</th>
                <th scope="col">Weld Temp</th>
                <th scope="col">Pressure</th>
                <th scope="col">Result</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {records.map((r, idx) => (
                <tr key={idx}>
                  <td>#{r.id || idx + 1}</td>
                  <td className="fw-bold text-primary">{r.seal_barcode}</td>
                  <td className="fw-bold text-dark">{r.meter_serial}</td>
                  <td>{r.weld_temp || '185°C'}</td>
                  <td>{r.pressure || '4.2 bar'}</td>
                  <td>
                    <span className="badge bg-success text-white">
                      {r.status || 'VERIFIED'}
                    </span>
                  </td>
                  <td className="text-muted">{r.time || '10:20 AM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
