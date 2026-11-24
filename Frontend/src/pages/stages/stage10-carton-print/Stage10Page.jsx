import React from 'react';
import { useStage10CartonPrint } from '../../../hooks/stages/useStage10CartonPrint';
import CartonWeightScaleWidget from '../../../components/stages/stage10-carton-print/hardware/CartonWeightScaleWidget';
import ZebraCartonPrintTrigger from '../../../components/stages/stage10-carton-print/hardware/ZebraCartonPrintTrigger';
import CartonItemCounter from '../../../components/stages/stage10-carton-print/CartonItemCounter';

export default function Stage10Page() {
  const {
    meterSerial,
    setMeterSerial,
    scaleWeight,
    scaleConnected,
    isWeighing,
    printerOnline,
    isPrinting,
    cartonBarcode,
    isPacked,
    isWeightPass,
    weightStatus,
    records,
    loadingRecords,
    logs,
    tareScale,
    triggerWeighing,
    triggerPrintAndPack,
    resetStation,
    fetchRecords
  } = useStage10CartonPrint();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      triggerWeighing(meterSerial);
    }
  };

  const handleExportCsv = () => {
    let csv = "\uFEFFID,Carton Number,Meter Serial,Gross Weight,Print Status,Result,Timestamp\n";
    records.forEach((r, idx) => {
      csv += `${r.id || idx + 1},${r.carton_no},${r.meter_serial},${r.gross_weight},${r.print_status || 'PRINTED'},${r.status || 'PASS'},${r.time || 'N/A'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage10_Carton_Packaging_${Date.now()}.csv`;
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
                  <i className="ti ti-printer text-primary"></i>
                  <span>Stage 10: Individual Meter Carton Print &amp; Weight Verification</span>
                </h1>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6 shadow-2xs">
                  Stage 10
                </span>
                <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                  <i className="ti ti-circle-check fs-6"></i> Station Active (Station-10)
                </span>
                {isPacked && (
                  <span className="badge bg-success text-white px-3 py-1 font-mono shadow-2xs">
                    <i className="ti ti-package me-1"></i>CARTON PACKED
                  </span>
                )}
              </div>
              <p className="text-secondary mb-0 small">
                Packaging line &bull; RS-232 digital scale gross weight verification (485g &plusmn; 15g) and automated Zebra thermal barcode label printing.
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
                onClick={resetStation}
              >
                <i className="ti ti-refresh me-1"></i> Next Carton
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Input */}
      <div className="card shadow-sm border-0 bg-white mb-4">
        <div className="card-header bg-white border-bottom py-2">
          <span className="fw-bold text-dark">
            <i className="ti ti-scan text-primary me-1"></i> Scan Meter Barcode into Carton
          </span>
        </div>
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-light"><i className="ti ti-barcode"></i></span>
            <input
              type="text"
              className="form-control font-monospace fw-bold text-primary"
              placeholder="Scan Meter Serial Number (e.g. ZM-MTR-2026-9001)..."
              value={meterSerial}
              onChange={(e) => setMeterSerial(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isPrinting}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-outline-primary fw-bold"
              onClick={() => triggerWeighing(meterSerial)}
              disabled={!meterSerial.trim() || isWeighing}
            >
              <i className="ti ti-scale me-1"></i> Sample Weight
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry & Printing Widgets */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <CartonWeightScaleWidget
            weight={scaleWeight}
            isPass={isWeightPass}
            status={weightStatus}
            onTare={tareScale}
            isWeighing={isWeighing}
            connected={scaleConnected}
          />
        </div>
        <div className="col-lg-6">
          <ZebraCartonPrintTrigger
            onPrint={triggerPrintAndPack}
            isPrinting={isPrinting}
            printerOnline={printerOnline}
            disabled={!meterSerial.trim() || !isWeightPass}
            cartonBarcode={cartonBarcode}
          />
        </div>
      </div>

      {/* Checklist & Console Logs */}
      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <CartonItemCounter meterSerial={meterSerial} />
        </div>
        <div className="col-lg-7">
          <div className="card bg-dark text-white border-secondary font-mono shadow-sm h-100">
            <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
              <span className="small text-secondary fw-bold">
                <i className="ti ti-terminal me-2 text-info"></i>Station 10 Packaging Console Logs
              </span>
              <span className="badge bg-secondary text-white text-xs">Scale &bull; Zebra Synced</span>
            </div>
            <div className="card-body p-3 overflow-auto" style={{ maxHeight: '180px', fontSize: '0.785rem' }}>
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

      {/* Packed Cartons Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 10 Packed Cartons History
            </h6>
            <small className="text-secondary">Recent individual cartons packaged and printed in current shift</small>
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
                <th scope="col">Carton Barcode</th>
                <th scope="col">Meter Serial Number</th>
                <th scope="col">Gross Weight</th>
                <th scope="col">Thermal Label</th>
                <th scope="col">Status</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {records.map((r, idx) => (
                <tr key={idx}>
                  <td>#{r.id || idx + 1}</td>
                  <td className="fw-bold text-primary">{r.carton_no}</td>
                  <td className="fw-bold text-dark">{r.meter_serial}</td>
                  <td>{r.gross_weight}</td>
                  <td>
                    <span className="badge bg-info-subtle text-info border border-info">
                      {r.print_status || 'PRINTED'}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-success text-white">
                      {r.status || 'PASS'}
                    </span>
                  </td>
                  <td className="text-muted">{r.time || '10:30 AM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
