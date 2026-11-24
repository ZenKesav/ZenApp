import React from 'react';
import StatusBadge from '../../../common/StatusBadge/StatusBadge';

export default function MeterPrintHistoryTable({ records = [], loading = false, onRefresh }) {
  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="fw-bold mb-0 text-dark">
            <i className="ti ti-history me-1 text-primary"></i> Stage 09 Meter Print & Verification History
          </h6>
          <small className="text-secondary">Recent records printed and verified via optical DLMS link</small>
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
              <th scope="col">Meter Serial No</th>
              <th scope="col">IMEI Number</th>
              <th scope="col">NIC Serial</th>
              <th scope="col">Work Order</th>
              <th scope="col">Optical Probe</th>
              <th scope="col">Laser Etch</th>
              <th scope="col">Overall Status</th>
              <th scope="col">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading print records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  <i className="ti ti-inbox fs-2 d-block mb-1 text-secondary"></i>
                  No meter print records logged yet in this shift.
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <tr key={r.id || r._id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="fw-bold font-monospace text-primary">{r.meter_no || r.serialNo || '-'}</td>
                  <td className="font-monospace small">{r.imei_no || r.imei || '-'}</td>
                  <td className="font-monospace small">{r.nic_no || r.nicSrNo || '-'}</td>
                  <td><span className="badge bg-light text-dark border">{r.work_order || 'WO-STG09'}</span></td>
                  <td>
                    {r.optical_verified ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        <i className="ti ti-check me-1"></i> Verified
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">
                        <i className="ti ti-minus me-1"></i> Skipped
                      </span>
                    )}
                  </td>
                  <td>
                    {r.laser_verified !== false ? (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                        <i className="ti ti-laser me-1"></i> Laser Etched
                      </span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning">Pending</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status || 'PASSED'} />
                  </td>
                  <td className="small text-secondary">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Just now'}
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
