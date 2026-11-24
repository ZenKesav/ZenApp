import React from 'react';
import { SkeletonTable, Pagination, TableFilterBar, TableStatusSelect } from '../../common/CommonComponents';

export default function ShiftTable({
  shifts = [],
  loading = false,
  initialLoading = false,
  searchTerm = '',
  onSearchChange,
  statusFilter = '',
  onStatusChange,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onViewShift,
  onEditShift,
  onDeleteShift
}) {
  const formatDateTime = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return String(dateVal);
    }
  };

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const paginatedShifts = safeShifts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card shadow-sm border">
      <TableFilterBar
        variant="embedded"
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search shift name..."
        loading={loading && !initialLoading}
        rightExtras={
          <TableStatusSelect
            value={statusFilter}
            onChange={onStatusChange}
            options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' }
            ]}
          />
        }
      />

      {initialLoading || loading ? (
        <SkeletonTable rows={5} columns={8} embedded />
      ) : (
        <>
          <div className="table-responsive">
            <div className="table-swipe-hint d-md-none">
              <i className="ti ti-arrows-left-right text-primary me-1"></i>
              <span>Swipe horizontally to view all columns</span>
            </div>
            <table className="table mb-0 align-middle table-hover">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }} className="text-center">S.No</th>
                  <th>Shift Name</th>
                  <th>Timings (Start - End)</th>
                  <th>Duration</th>
                  <th>Created At / By</th>
                  <th>Updated At / By</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeShifts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="ti ti-clock-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold">No work shifts found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedShifts.map((s, index) => {
                    const active = s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1';
                    const createdBy = s.created_by || 'admin@zenmeter.com';
                    const updatedBy = s.updated_by || '-';

                    return (
                      <tr key={s.id}>
                        <td className="fw-semibold text-center text-secondary">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{s.shift_name}</div>
                          <small className="text-muted text-xs">{s.shift_type || 'Production Shift'}</small>
                        </td>
                        <td className="fw-medium font-mono text-primary">
                          <i className="ti ti-clock me-1 text-secondary"></i>
                          {s.start_time} - {s.end_time}
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary px-2 py-1 font-mono">
                            {s.duration_hours || 8} Hours Shift
                          </span>
                        </td>
                        <td className="small font-mono">
                          <div className="text-dark fw-medium">{formatDateTime(s.created_at)}</div>
                          <div className="text-muted text-xs"><i className="ti ti-user me-1"></i>{createdBy}</div>
                        </td>
                        <td className="small font-mono">
                          <div className="text-dark fw-medium">{formatDateTime(s.updated_at)}</div>
                          <div className="text-muted text-xs">{updatedBy !== '-' ? <><i className="ti ti-user me-1"></i>{updatedBy}</> : '-'}</div>
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 ${active
                            ? 'bg-success-subtle text-success border border-success'
                            : 'bg-secondary-subtle text-secondary border'
                            }`}>
                            <i className={`ti ${active ? 'ti-circle-check' : 'ti-circle-x'} me-1`}></i>
                            {active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            {onViewShift && (
                              <button
                                onClick={() => onViewShift(s)}
                                className="btn btn-sm btn-action-view border-0"
                                title="View Shift Details"
                              >
                                <i className="ti ti-eye fs-5"></i>
                              </button>
                            )}
                            {onEditShift && (
                              <button
                                onClick={() => onEditShift(s)}
                                className="btn btn-sm btn-action-edit border-0"
                                title="Edit Shift"
                              >
                                <i className="ti ti-edit fs-5"></i>
                              </button>
                            )}
                            {onDeleteShift && (
                              <button
                                onClick={() => onDeleteShift(s)}
                                className="btn btn-sm btn-action-delete border-0"
                                title="Delete Shift"
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
            totalItems={safeShifts.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
