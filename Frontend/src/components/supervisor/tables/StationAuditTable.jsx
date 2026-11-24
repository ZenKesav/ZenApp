import React from 'react';

export default function StationAuditTable({ auditLogs = [], loading = false, onRefresh }) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="fw-bold mb-0 text-dark">
            <i className="ti ti-shield-search me-1 text-primary"></i> Station & Work Order Audit Trail
          </h6>
          <small className="text-secondary">Immutable logs of overrides, work order shifts, and operator re-assignments</small>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <i className={`ti ti-refresh me-1 ${loading ? 'ti-spin' : ''}`}></i> Refresh
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '50px' }}>#</th>
              <th scope="col">Event / Action</th>
              <th scope="col">Stage</th>
              <th scope="col">Meter No</th>
              <th scope="col">Authorized By</th>
              <th scope="col">Justification</th>
              <th scope="col">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading audit logs...
                </td>
              </tr>
            ) : auditLogs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  <i className="ti ti-shield fs-2 d-block mb-1 text-secondary"></i>
                  No supervisor audit events recorded today.
                </td>
              </tr>
            ) : (
              auditLogs.map((log, idx) => (
                <tr key={log.id || log._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      {log.action || 'STAGE_OVERRIDE'}
                    </span>
                  </td>
                  <td>Stage {log.stage_number || '09'}</td>
                  <td className="font-monospace fw-bold text-dark">{log.meter_no || '-'}</td>
                  <td className="small fw-semibold">{log.supervisor_name || 'Line Supervisor'}</td>
                  <td className="small text-secondary">{log.justification || 'Retest authorized after fixture clean'}</td>
                  <td className="small text-secondary">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
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
