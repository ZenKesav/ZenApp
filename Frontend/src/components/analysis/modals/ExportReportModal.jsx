import React, { useState } from 'react';

export default function ExportReportModal({ isOpen, onClose, onExport }) {
  const [format, setFormat] = useState('csv'); // 'csv' | 'excel' | 'pdf'
  const [includeQuarantine, setIncludeQuarantine] = useState(true);
  const [includeTelemetry, setIncludeTelemetry] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    if (onExport) {
      onExport({ format, includeQuarantine, includeTelemetry });
    }
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-download me-2"></i> Export Production Analytics Report
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">File Export Format</label>
              <div className="d-flex gap-2">
                {[
                  { id: 'csv', label: 'CSV Spreadsheet', icon: 'ti-file-spreadsheet' },
                  { id: 'excel', label: 'Excel (.xlsx)', icon: 'ti-file-excel' },
                  { id: 'pdf', label: 'PDF Document', icon: 'ti-file-text' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`btn btn-sm flex-fill ${format === f.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setFormat(f.id)}
                  >
                    <i className={`ti ${f.icon} me-1`}></i> {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Export Data Inclusions</label>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="includeQuarantineCheck"
                  checked={includeQuarantine}
                  onChange={(e) => setIncludeQuarantine(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="includeQuarantineCheck">
                  Include quarantine hold & rejected scrap meter logs
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="includeTelemetryCheck"
                  checked={includeTelemetry}
                  onChange={(e) => setIncludeTelemetry(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="includeTelemetryCheck">
                  Include raw DLMS optical response times and laser duty cycles
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer bg-light border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleExport}>
              Download Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
