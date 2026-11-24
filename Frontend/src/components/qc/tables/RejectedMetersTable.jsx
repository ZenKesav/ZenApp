import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function RejectedMetersTable({
  rejectedMeters = [],
  loading = false,
  onViewDefect
}) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="table-responsive">
        <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '50px' }}>#</th>
              <th scope="col">Meter Serial No</th>
              <th scope="col">Defect Category</th>
              <th scope="col">Reject Reason</th>
              <th scope="col">Stage Rejected</th>
              <th scope="col">Inspector</th>
              <th scope="col">Status</th>
              <th scope="col">Rejection Date</th>
              <th scope="col" className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-danger me-2" role="status"></div>
                  Loading rejected meters...
                </td>
              </tr>
            ) : rejectedMeters.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  <i className="ti ti-thumb-up fs-2 d-block mb-1 text-success"></i>
                  Zero rejected meters logged in current production batch.
                </td>
              </tr>
            ) : (
              rejectedMeters.map((m, idx) => (
                <tr key={m.id || m._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="fw-bold font-monospace text-danger">{m.meter_no || m.serialNo || '-'}</td>
                  <td>
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                      {m.defect_category || 'Optical Failure'}
                    </span>
                  </td>
                  <td className="text-secondary small">{m.reason || m.reject_reason || 'DLMS Handshake Timeout'}</td>
                  <td>Stage {m.stage_number || '09'}</td>
                  <td className="small fw-semibold">{m.inspector || 'QC Lead'}</td>
                  <td>
                    <StatusBadge status="REJECTED" />
                  </td>
                  <td className="small text-secondary">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Today'}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => onViewDefect && onViewDefect(m)}
                    >
                      <i className="ti ti-file-description me-1"></i> Defect Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
