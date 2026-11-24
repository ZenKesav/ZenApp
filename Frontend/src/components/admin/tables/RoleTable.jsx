import React from 'react';
import { SkeletonTable, Pagination, TableFilterBar, TableStatusSelect } from '../../common/CommonComponents';

export default function RoleTable({
  roles = [],
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
  onEditRole,
  onDeleteRole
}) {
  const getRoleBadgeClass = (rName) => {
    switch (rName) {
      case 'ADMIN': return 'bg-danger-subtle text-danger border-danger';
      case 'SUPERVISOR': return 'bg-primary-subtle text-primary border-primary';
      case 'OPERATOR': return 'bg-warning-subtle text-warning-emphasis border-warning';
      case 'QC': return 'bg-success-subtle text-success border-success';
      case 'REPORT_VIEWER': return 'bg-info-subtle text-info-emphasis border-info';
      default: return 'bg-light text-dark border';
    }
  };

  const isRoleActive = (r) => {
    if (!r) return false;
    return r.status === true || r.status === 'ACTIVE' || r.status === 1 || r.status === 'true';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const normalizedStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) return String(dateStr);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');

      return `${year}-${month}-${day} ${formattedHours}:${minutes} ${ampm}`;
    } catch (e) {
      return String(dateStr);
    }
  };

  const safeRoles = Array.isArray(roles) ? roles : [];
  const paginatedRoles = safeRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card shadow-sm border">
      <TableFilterBar
        variant="embedded"
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search Role Name or Description..."
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
        <SkeletonTable rows={5} columns={7} embedded />
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
                  <th style={{ width: '80px' }} className="text-center">S.No</th>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Created At / By</th>
                  <th>Updated At / By</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeRoles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ti ti-database-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold">Data not found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((r, index) => {
                    const active = isRoleActive(r);
                    const rId = r?.role_id || r?.id;
                    const rName = r?.role_name || r?.name || 'ROLE';
                    const rDesc = r?.role_description || r?.description || 'Custom System Role';
                    const createdBy = r?.created_by || 'admin@zenmeter.com';
                    const updatedBy = r?.updated_by || '-';

                    return (
                      <tr key={rId || rName}>
                        <td className="fw-semibold text-center text-secondary">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td>
                          <span className={`badge border px-2 py-1 ${getRoleBadgeClass(rName)}`}>
                            {rName}
                          </span>
                        </td>
                        <td className="text-dark small">{rDesc}</td>
                        <td className="small font-mono">
                          <div className="text-dark fw-medium">{formatDate(r?.created_at)}</div>
                          <div className="text-muted text-xs"><i className="ti ti-user me-1"></i>{createdBy}</div>
                        </td>
                        <td className="small font-mono">
                          <div className="text-dark fw-medium">{formatDate(r?.updated_at)}</div>
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
                            <button
                              onClick={() => onEditRole(r)}
                              className="btn btn-sm btn-action-edit border-0"
                              title="Edit Role"
                            >
                              <i className="ti ti-edit fs-5"></i>
                            </button>
                            <button
                              onClick={() => onDeleteRole(r)}
                              className="btn btn-sm btn-action-delete border-0"
                              title="Delete Role"
                            >
                              <i className="ti ti-trash fs-5"></i>
                            </button>
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
            totalItems={safeRoles.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
