import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function QCTestDetailModal({ isOpen, record, onClose }) {
  if (!isOpen || !record) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-checklist me-2"></i> QC Test Record Details
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
              <div>
                <span className="small text-secondary text-uppercase fw-semibold">Meter Serial Number</span>
                <h4 className="fw-bold font-monospace text-primary mb-0">{record.meter_no || record.serialNo}</h4>
              </div>
              <div className="text-end">
                <span className="small text-secondary d-block mb-1">Inspection Verdict</span>
                <StatusBadge status={record.status || 'PASSED'} />
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Stage Inspected</div>
                  <div className="fw-bold text-dark">Stage {record.stage_number || '09'}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Inspector Name</div>
                  <div className="fw-bold text-dark">{record.inspector_name || 'QC Officer'}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Timestamp</div>
                  <div className="fw-bold text-dark">
                    {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Recent'}
                  </div>
                </div>
              </div>
            </div>

            <h6 className="fw-bold text-dark mb-2">Inspection Checklist Criteria</h6>
            <div className="table-responsive border rounded mb-3">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Parameter</th>
                    <th>Nominal / Spec</th>
                    <th>Measured Value</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Optical DLMS Handshake</td>
                    <td>Response &lt; 200ms</td>
                    <td>{record.optical_response || '48ms'}</td>
                    <td><span className="badge bg-success-subtle text-success">PASS</span></td>
                  </tr>
                  <tr>
                    <td>Laser Engraving Contrast</td>
                    <td>Deep High-Contrast</td>
                    <td>Verified OD 2.4</td>
                    <td><span className="badge bg-success-subtle text-success">PASS</span></td>
                  </tr>
                  <tr>
                    <td>Barcode / QR Readability</td>
                    <td>Grade A (ISO/IEC 15415)</td>
                    <td>Grade A Scan</td>
                    <td><span className="badge bg-success-subtle text-success">PASS</span></td>
                  </tr>
                  <tr>
                    <td>Enclosure Flange Fit</td>
                    <td>Flush IP54 Seal</td>
                    <td>0.12mm gap</td>
                    <td><span className="badge bg-success-subtle text-success">PASS</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {record.remarks && (
              <div className="p-3 bg-light rounded border">
                <span className="fw-semibold text-secondary small d-block mb-1">Inspector Remarks:</span>
                <p className="mb-0 text-dark small">{record.remarks}</p>
              </div>
            )}
          </div>
          <div className="modal-footer bg-light border-top">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
