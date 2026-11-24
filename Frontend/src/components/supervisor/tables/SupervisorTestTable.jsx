import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function SupervisorTestTable({
  tests = [],
  loading = false,
  onViewRecord,
  onOverride
}) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="table-responsive">
        <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '50px' }}>#</th>
              <th scope="col">Test ID</th>
              <th scope="col">Meter Serial No</th>
              <th scope="col">Stage</th>
              <th scope="col">Operator</th>
              <th scope="col">Test Status</th>
              <th scope="col">Supervisor Override</th>
              <th scope="col">Timestamp</th>
              <th scope="col" className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading supervisor test records...
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  <i className="ti ti-checklist fs-2 d-block mb-1 text-secondary"></i>
                  No supervisor test records match your filter criteria.
                </td>
              </tr>
            ) : (
              tests.map((t, idx) => (
                <tr key={t.id || t._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="font-monospace small fw-semibold text-secondary">
                    {t.test_id || t.id?.substring(0, 8) || `SUP-TST-${2000 + idx}`}
                  </td>
                  <td className="fw-bold font-monospace text-primary">{t.meter_no || t.serialNo || '-'}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      Stage {t.stage_number || t.stage || '04'}
                    </span>
                  </td>
                  <td>
                    <span className="small fw-semibold">{t.operator_name || t.testedBy || 'Operator 1'}</span>
                  </td>
                  <td>
                    <StatusBadge status={t.status || 'PASSED'} />
                  </td>
                  <td>
                    {t.is_overridden ? (
                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                        <i className="ti ti-shield-check me-1"></i> Overridden
                      </span>
                    ) : (
                      <span className="badge bg-light text-secondary border">Standard</span>
                    )}
                  </td>
                  <td className="small text-secondary">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Just now'}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm me-1"
                      onClick={() => onViewRecord(t)}
                    >
                      <i className="ti ti-eye me-1"></i> View
                    </button>
                    {t.status === 'FAILED' && !t.is_overridden && (
                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => onOverride(t)}
                      >
                        <i className="ti ti-shield-lock me-1"></i> Override
                      </button>
                    )}
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
