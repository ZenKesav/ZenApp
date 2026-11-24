import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function SupervisorRecordModal({ isOpen, record, onClose }) {
  if (!isOpen || !record) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-eye me-2"></i> Stage Production Test Detail
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
              <div>
                <span className="small text-secondary text-uppercase fw-semibold">Target Meter</span>
                <h4 className="fw-bold font-monospace text-primary mb-0">{record.meter_no || record.serialNo}</h4>
              </div>
              <div className="text-end">
                <span className="small text-secondary d-block mb-1">Production Status</span>
                <StatusBadge status={record.status || 'PASSED'} />
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Stage Executed</div>
                  <div className="fw-bold text-dark">Stage {record.stage_number || '04'}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Operator</div>
                  <div className="fw-bold text-dark">{record.operator_name || 'Line Operator'}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded border">
                  <div className="small text-secondary">Recorded At</div>
                  <div className="fw-bold text-dark">
                    {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Recent'}
                  </div>
                </div>
              </div>
            </div>

            <h6 className="fw-bold text-dark mb-2">Stage Telemetry Snapshot</h6>
            <div className="bg-light p-3 rounded border font-monospace small mb-3">
              <pre className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(record.telemetry || {
                  cycle_time: '18.4s',
                  voltage: '239.8V',
                  current: '10.02A',
                  optical_probe_connected: true,
                  laser_mark_duty: '85%',
                  barcode_match: true
                }, null, 2)}
              </pre>
            </div>
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
