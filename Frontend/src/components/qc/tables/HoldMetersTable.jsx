import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function HoldMetersTable({
  holdMeters = [],
  loading = false,
  onRelease,
  onReject
}) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="table-responsive">
        <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '50px' }}>#</th>
              <th scope="col">Meter Serial No</th>
              <th scope="col">Hold Reason</th>
              <th scope="col">Stage Held</th>
              <th scope="col">Quarantine Location</th>
              <th scope="col">Status</th>
              <th scope="col">Held Date</th>
              <th scope="col" className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
                  Loading quarantined hold meters...
                </td>
              </tr>
            ) : holdMeters.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  <i className="ti ti-check-circle fs-2 d-block mb-1 text-success"></i>
                  No meters currently on quarantine hold.
                </td>
              </tr>
            ) : (
              holdMeters.map((m, idx) => (
                <tr key={m.id || m._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="fw-bold font-monospace text-primary">{m.meter_no || m.serialNo || '-'}</td>
                  <td className="text-danger fw-semibold">{m.reason || m.hold_reason || 'Calibration Drift'}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      Stage {m.stage_number || '09'}
                    </span>
                  </td>
                  <td>
                    <span className="small text-secondary">{m.quarantine_zone || 'Quarantine Shelf B-2'}</span>
                  </td>
                  <td>
                    <StatusBadge status="HOLD" />
                  </td>
                  <td className="small text-secondary">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Today'}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm me-1"
                      onClick={() => onRelease && onRelease(m)}
                    >
                      <i className="ti ti-check me-1"></i> Release
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onReject && onReject(m)}
                    >
                      <i className="ti ti-trash me-1"></i> Scrap
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
