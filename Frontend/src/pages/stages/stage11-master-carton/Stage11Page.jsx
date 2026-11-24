import React from 'react';
import { useStage11MasterCarton } from '../../../hooks/stages/useStage11MasterCarton';
import PalletGrossWeightWidget from '../../../components/stages/stage11-master-carton/hardware/PalletGrossWeightWidget';
import ZebraMasterPrintTrigger from '../../../components/stages/stage11-master-carton/hardware/ZebraMasterPrintTrigger';
import MasterBoxProgress from '../../../components/stages/stage11-master-carton/MasterBoxProgress';

export default function Stage11Page() {
  const {
    cartonInput,
    setCartonInput,
    capacity,
    packedCartons,
    grossWeight,
    scaleConnected,
    printerOnline,
    isPrinting,
    masterSerial,
    isSealed,
    records,
    loadingRecords,
    logs,
    addCarton,
    removeCarton,
    sealAndPrintMasterBox,
    resetForNextMaster,
    fetchRecords
  } = useStage11MasterCarton();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addCarton(cartonInput);
    }
  };

  const handleExportCsv = () => {
    let csv = "\uFEFFID,Master Box Number,Carton Count,Gross Weight,Destination,Status,Timestamp\n";
    records.forEach((r, idx) => {
      csv += `${r.id || idx + 1},${r.master_no},${r.carton_count || 10},${r.gross_weight},${r.destination || 'BESCOM'},${r.status || 'DISPATCH_READY'},${r.time || 'N/A'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage11_Pallet_Manifest_${Date.now()}.csv`;
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
                  <i className="ti ti-layers text-primary"></i>
                  <span>Stage 11: Master Carton Aggregation &amp; Pallet Shipping</span>
                </h1>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6 shadow-2xs">
                  Stage 11
                </span>
                <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                  <i className="ti ti-circle-check fs-6"></i> Station Active (Station-11)
                </span>
                {isSealed && (
                  <span className="badge bg-success text-white px-3 py-1 font-mono shadow-2xs">
                    <i className="ti ti-check me-1"></i>DISPATCH READY
                  </span>
                )}
              </div>
              <p className="text-secondary mb-0 small">
                Pallet packing area &bull; Aggregates 10 individual cartons into master outer shipper, industrial gross weight verification &amp; 4x6" GS1 shipping labels.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary btn-sm font-sans fw-semibold shadow-2xs"
                onClick={handleExportCsv}
              >
                <i className="ti ti-file-spreadsheet me-1 text-success"></i> Download Pallet Manifest
              </button>
              <button
                className="btn btn-light border btn-sm font-sans fw-semibold"
                onClick={resetForNextMaster}
              >
                <i className="ti ti-refresh me-1"></i> Next Master Box
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Carton Scanner Input */}
      <div className="card shadow-sm border-0 bg-white mb-4">
        <div className="card-header bg-white border-bottom py-2">
          <span className="fw-bold text-dark">
            <i className="ti ti-scan text-primary me-1"></i> Scan Individual Carton into Master Box
          </span>
        </div>
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-light"><i className="ti ti-box"></i></span>
            <input
              type="text"
              className="form-control font-monospace fw-bold text-primary"
              placeholder="Scan Carton Barcode (e.g. CTN-ZM-2601-1005)..."
              value={cartonInput}
              onChange={(e) => setCartonInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isPrinting || packedCartons.length >= capacity}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-primary px-4 fw-bold"
              onClick={() => addCarton(cartonInput)}
              disabled={!cartonInput.trim() || packedCartons.length >= capacity || isPrinting}
            >
              <i className="ti ti-plus me-1"></i> Add to Box
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Packing Chips */}
      <MasterBoxProgress
        cartons={packedCartons}
        capacity={capacity}
        onRemoveCarton={removeCarton}
        disabled={isPrinting}
      />

      {/* Hardware Telemetry: Scale & Zebra Label Printer */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <PalletGrossWeightWidget
            weight={grossWeight}
            connected={scaleConnected}
            cartonCount={packedCartons.length}
            capacity={capacity}
          />
        </div>
        <div className="col-lg-6">
          <ZebraMasterPrintTrigger
            onPrint={sealAndPrintMasterBox}
            isPrinting={isPrinting}
            printerOnline={printerOnline}
            masterSerial={masterSerial}
            cartonCount={packedCartons.length}
            capacity={capacity}
            isSealed={isSealed}
          />
        </div>
      </div>

      {/* Live Console Logs */}
      <div className="card bg-dark text-white border-secondary font-mono shadow-sm mb-4">
        <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
          <span className="small text-secondary fw-bold">
            <i className="ti ti-terminal me-2 text-info"></i>Station 11 Pallet Shipper Telemetry Logs
          </span>
          <span className="badge bg-secondary text-white text-xs">Floor Scale &bull; Zebra Synced</span>
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

      {/* Completed Master Cartons Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 11 Master Shipper Boxes
            </h6>
            <small className="text-secondary">Recent completed master shipping boxes and pallet consignments</small>
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
                <th scope="col">Master Shipper Serial</th>
                <th scope="col">Meters Packed</th>
                <th scope="col">Gross Weight</th>
                <th scope="col">Destination</th>
                <th scope="col">Shipping Status</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {records.map((r, idx) => (
                <tr key={idx}>
                  <td>#{r.id || idx + 1}</td>
                  <td className="fw-bold text-primary">{r.master_no}</td>
                  <td>{r.carton_count || 10} Units</td>
                  <td>{r.gross_weight}</td>
                  <td>{r.destination || 'BESCOM'}</td>
                  <td>
                    <span className="badge bg-success text-white">
                      {r.status || 'DISPATCH_READY'}
                    </span>
                  </td>
                  <td className="text-muted">{r.time || '10:45 AM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
