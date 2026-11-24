import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function QCTestTable({
  tests = [],
  loading = false,
  onViewRecord,
  onRetest
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
              <th scope="col">Test Type</th>
              <th scope="col">Inspector</th>
              <th scope="col">QC Status</th>
              <th scope="col">Tested At</th>
              <th scope="col" className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading QC test records...
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  <i className="ti ti-checklist fs-2 d-block mb-1 text-secondary"></i>
                  No QC test records match your filter criteria.
                </td>
              </tr>
            ) : (
              tests.map((t, idx) => (
                <tr key={t.id || t._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="font-monospace small fw-semibold text-secondary">
                    {t.test_id || t.id?.substring(0, 8) || `QC-TST-${1000 + idx}`}
                  </td>
                  <td className="fw-bold font-monospace text-primary">{t.meter_no || t.serialNo || '-'}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      Stage {t.stage_number || t.stage || '09'}
                    </span>
                  </td>
                  <td>
                    <span className="small text-secondary">{t.test_type || 'AQL Visual & Optical'}</span>
                  </td>
                  <td>
                    <span className="small fw-semibold">{t.inspector_name || t.testedBy || 'QC Inspector'}</span>
                  </td>
                  <td>
                    <StatusBadge status={t.status || 'PASSED'} />
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
                    {onRetest && t.status === 'FAILED' && (
                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => onRetest(t)}
                      >
                        <i className="ti ti-rotate me-1"></i> Retest
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
