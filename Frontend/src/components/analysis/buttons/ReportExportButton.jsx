import React from 'react';

export default function ReportExportButton({ onOpenExport, disabled = false }) {
  return (
    <div className="btn-group btn-group-sm" role="group">
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={onOpenExport}
        disabled={disabled}
      >
        <i className="ti ti-download me-1"></i> Export Report
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => window.print()}
        disabled={disabled}
      >
        <i className="ti ti-printer me-1"></i> Print
      </button>
    </div>
  );
}
