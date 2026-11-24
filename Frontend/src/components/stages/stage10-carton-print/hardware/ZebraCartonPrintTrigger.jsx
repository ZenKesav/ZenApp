import React from 'react';

export default function ZebraCartonPrintTrigger({
  onPrint,
  isPrinting = false,
  printerOnline = true,
  disabled = false,
  cartonBarcode = ''
}) {
  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-printer fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Zebra Thermal Label Printer (ZPL II)</h6>
            <small className="text-secondary">Prints 100x50mm carton barcode label</small>
          </div>
        </div>
        <span className={`badge ${printerOnline ? 'bg-success' : 'bg-danger'} text-white font-mono`}>
          <i className={`ti ${printerOnline ? 'ti-circle-check' : 'ti-alert-circle'} me-1`}></i>
          {printerOnline ? 'PRINTER ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="card-body p-4 text-center">
        {cartonBarcode ? (
          <div className="p-3 bg-light rounded-3 border mb-3 font-mono">
            <small className="text-muted d-block">ACTIVE CARTON SERIAL</small>
            <strong className="text-primary fs-5">{cartonBarcode}</strong>
            <div className="mt-2 text-xs text-success">
              <i className="ti ti-check me-1"></i> Label Dispatched &amp; Printed
            </div>
          </div>
        ) : (
          <div className="p-3 bg-light-subtle rounded-3 border border-dashed mb-3">
            <i className="ti ti-barcode fs-2 text-muted mb-1 d-block"></i>
            <span className="text-secondary small">Place carton on scale and scan meter to trigger print</span>
          </div>
        )}

        <button
          type="button"
          className={`btn w-100 py-2.5 fw-bold shadow-sm ${disabled || isPrinting ? 'btn-secondary' : 'btn-primary'}`}
          onClick={onPrint}
          disabled={disabled || isPrinting}
        >
          <i className={`ti ${isPrinting ? 'ti-loader spin' : 'ti-printer'} me-1`}></i>
          {isPrinting ? 'Printing Thermal Label...' : 'Print Carton Label & Confirm Pack'}
        </button>
      </div>
    </div>
  );
}
