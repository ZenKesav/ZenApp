import React from 'react';
import { SkeletonTable, Pagination } from '../../common/CommonComponents';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function WorkOrderTable({
  assignments = [],
  loading = false,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  getStageName
}) {
  const safeList = Array.isArray(assignments) ? assignments : [];
  const paginated = safeList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return <SkeletonTable rows={6} columns={7} />;
  }

  return (
    <div className="card shadow-xs table-card border">
      <div className="table-responsive">
        <div className="table-swipe-hint d-md-none">
          <i className="ti ti-arrows-left-right text-primary me-1"></i>
          <span>Swipe horizontally to view all columns</span>
        </div>
        <table className="table mb-0 align-middle table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: '60px' }} className="text-center">S.No</th>
              <th>Operator</th>
              <th>Employee ID</th>
              <th>Assigned Stage</th>
              <th>Hardware Station</th>
              <th>Assigned By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {safeList.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">
                  <i className="ti ti-clipboard-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                  <span className="fw-semibold">No active assignments found</span>
                </td>
              </tr>
            ) : (
              paginated.map((a, index) => (
                <tr key={a.id || index}>
                  <td className="fw-semibold text-center text-secondary">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{a.user_name || a.operator_name || a.name || 'Operator'}</div>
                  </td>
                  <td className="font-mono text-primary fw-medium">{a.employee_id}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {getStageName ? getStageName(a.stage_id) : `Stage #${a.stage_id}`}
                    </span>
                  </td>
                  <td className="font-mono text-muted">{a.station_id || 'STATION-01'}</td>
                  <td className="small text-muted">{a.assigned_by || 'Supervisor'}</td>
                  <td>
                    <StatusBadge status={a.status || 'ACTIVE'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={safeList.length}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
