import React from 'react';
import { SkeletonTable, Pagination } from '../../common/CommonComponents';

export default function StageManagementTable({
  stages = [],
  loading = false,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onViewStage,
  onEditStage,
  onDeleteStage
}) {
  const safeStages = Array.isArray(stages) ? stages : [];
  const paginatedStages = safeStages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return <SkeletonTable rows={5} columns={6} />;
  }

  return (
    <div className="card shadow-xs table-card">
      <div className="table-responsive">
        <table className="table mb-0 align-middle table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: '60px' }} className="text-center">S.No</th>
              <th style={{ width: '100px' }} className="text-center">Stage No</th>
              <th>Stage Name & Line Type</th>
              <th>Process Checks & Description</th>
              <th style={{ width: '130px' }} className="text-center">Status</th>
              <th className="text-end pe-4" style={{ minWidth: '135px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeStages.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-5 text-muted">
                  <i className="ti ti-subtask fs-2 d-block mb-2 text-secondary opacity-50"></i>
                  <span className="fw-semibold">No production stages found</span>
                </td>
              </tr>
            ) : (
              paginatedStages.map((s, index) => {
                const active = s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1';

                return (
                  <tr key={s.id}>
                    <td className="fw-semibold text-center text-secondary">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="text-center fw-semibold text-dark font-mono">
                      Stage {s.stage_number}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{s.stage_name}</div>
                      <small className="text-muted text-xs">{s.line_type || 'Main Meter Assembly Line'}</small>
                    </td>
                    <td className="small text-dark text-wrap" style={{ maxWidth: '320px' }}>
                      <span className="text-secondary">{s.description || '-'}</span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge px-2.5 py-1.5 font-mono ${active
                          ? 'bg-success-subtle text-success border border-success'
                          : 'bg-secondary-subtle text-secondary border'
                        }`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '98px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <i className={`ti ${active ? 'ti-circle-check' : 'ti-circle-x'} me-1.5`}></i>
                        {active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        {onViewStage && (
                          <button
                            onClick={() => onViewStage(s)}
                            className="btn btn-sm btn-action-view border-0 text-primary"
                            title="View Stage Details"
                          >
                            <i className="ti ti-eye fs-5"></i>
                          </button>
                        )}
                        {onEditStage && (
                          <button
                            onClick={() => onEditStage(s)}
                            className="btn btn-sm btn-action-edit border-0"
                            title="Edit Stage"
                          >
                            <i className="ti ti-edit fs-5"></i>
                          </button>
                        )}
                        {onDeleteStage && (
                          <button
                            onClick={() => onDeleteStage(s)}
                            className="btn btn-sm btn-action-delete border-0"
                            title="Delete Stage"
                          >
                            <i className="ti ti-trash fs-5"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={safeStages.length}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
