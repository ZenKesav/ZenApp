import React from 'react';

export default function JigActionButtons({
  testState = 'IDLE',
  onStartTest,
  onResetTest,
  onOpenPrintModal,
  onOpenValidateModal,
  hasData = false
}) {
  const isTesting = testState === 'STARTING' || testState === 'TESTING';

  return (
    <div className="card shadow-sm border mb-4">
      <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-light rounded-3">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-primary px-4 fw-bold shadow-sm"
            onClick={onStartTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <i className="ti ti-loader spin me-1.5"></i> Testing in Progress...
              </>
            ) : (
              <>
                <i className="ti ti-player-play me-1.5"></i> Run 8-Channel Jig Test
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={onResetTest}
            disabled={isTesting}
          >
            <i className="ti ti-refresh me-1"></i> Reset
          </button>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-primary px-3 fw-bold"
            onClick={onOpenPrintModal}
            disabled={!hasData || isTesting}
          >
            <i className="ti ti-printer me-1.5 fs-5"></i> Print Labels
          </button>

          <button
            type="button"
            className="btn btn-outline-primary px-3 fw-bold"
            onClick={onOpenValidateModal}
            disabled={!hasData || isTesting}
          >
            <i className="ti ti-qrcode me-1.5 fs-5"></i> Validate Barcode / QR
          </button>
        </div>
      </div>
    </div>
  );
}
