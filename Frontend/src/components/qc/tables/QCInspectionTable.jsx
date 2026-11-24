import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function QCInspectionTable({
  queue = [],
  loading = false,
  selectedMeter,
  onSelectMeter
}) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
        <span className="fw-bold text-dark">
          <i className="ti ti-list-check me-1 text-primary"></i> QC Inspection Queue
        </span>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
          {queue.length} Meters Pending
        </span>
      </div>
      <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <table className="table table-hover align-middle mb-0 text-nowrap">
          <thead className="table-light sticky-top">
            <tr>
              <th scope="col">Meter No</th>
              <th scope="col">Current Stage</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-3 text-secondary">
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span> Loading queue...
                </td>
              </tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-3 text-muted">
                  No meters currently awaiting QC inspection.
                </td>
              </tr>
            ) : (
              queue.map((m) => {
                const meterNum = m.meter_no || m.serialNo;
                const isSelected = selectedMeter === meterNum;
                return (
                  <tr
                    key={meterNum}
                    className={isSelected ? 'table-primary fw-bold' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectMeter(meterNum)}
                  >
                    <td className="font-monospace text-primary">{meterNum}</td>
                    <td>Stage {m.stage_number || m.stage || '09'}</td>
                    <td>
                      <StatusBadge status={m.status || 'PENDING'} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMeter(meterNum);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
