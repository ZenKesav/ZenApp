import React from 'react';

export default function ZebraMasterPrintTrigger({
  onPrint,
  isPrinting = false,
  printerOnline = true,
  masterSerial = '',
  cartonCount = 0,
  capacity = 10,
  isSealed = false
}) {
  const isFull = cartonCount === capacity;

  return (
    <div className="card shadow-sm border-0 bg-white h-100">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-printer fs-4 text-primary me-2"></i>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Zebra Industrial Shipper Printer (ZT411)</h6>
            <small className="text-secondary">Prints 4x6" GS1-128 shipping pallet label</small>
          </div>
        </div>
        <span className={`badge ${printerOnline ? 'bg-success' : 'bg-danger'} text-white font-mono`}>
          <i className={`ti ${printerOnline ? 'ti-circle-check' : 'ti-alert-circle'} me-1`}></i>
          {printerOnline ? 'PRINTER READY' : 'OFFLINE'}
        </span>
      </div>

      <div className="card-body p-4 text-center">
        {masterSerial && (
          <div className="p-3 bg-light rounded-3 border mb-3 font-mono">
            <small className="text-muted d-block">MASTER SHIPPER SERIAL</small>
            <strong className="text-primary fs-5">{masterSerial}</strong>
            <div className="mt-1 text-xs text-muted">
              Contents: <strong>{cartonCount} / {capacity} Meters</strong>
            </div>
            {isSealed && (
              <div className="mt-2 text-xs text-success fw-bold">
                <i className="ti ti-check me-1"></i> Label Dispatched &bull; Pallet Ready
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={`btn w-100 py-2.5 fw-bold shadow-sm ${cartonCount === 0 || isPrinting ? 'btn-secondary' : 'btn-primary'}`}
          onClick={onPrint}
          disabled={cartonCount === 0 || isPrinting}
        >
          <i className={`ti ${isPrinting ? 'ti-loader spin' : 'ti-printer'} me-1`}></i>
          {isPrinting ? 'Printing GS1 Label...' : isFull ? 'Seal & Print Master Shipping Label' : `Seal Partial Box (${cartonCount} units)`}
        </button>
      </div>
    </div>
  );
}
