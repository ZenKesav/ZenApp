import React from 'react';
import { SkeletonTable, Pagination, TableFilterBar, TableFilterSelect, TableStatusSelect } from '../../common/CommonComponents';

export default function UserTable({
  users = [],
  loading = false,
  initialLoading = false,
  searchTerm = '',
  onSearchChange,
  roleFilter = '',
  onRoleChange,
  activeRoles = [],
  statusFilter = '',
  onStatusChange,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onViewUser,
  onEditUser,
  onReassignStages,
  onDeleteUser,
  isSupervisor = false,
  renderAssignedStageCell
}) {
  const getRoleBadgeClass = (roleName) => {
    switch (roleName?.toUpperCase()) {
      case 'ADMIN': return 'bg-danger-subtle text-danger border-danger';
      case 'SUPERVISOR': return 'bg-primary-subtle text-primary border-primary';
      case 'OPERATOR': return 'bg-warning-subtle text-warning-emphasis border-warning';
      case 'QC': return 'bg-success-subtle text-success border-success';
      case 'REPORT_VIEWER': return 'bg-info-subtle text-info-emphasis border-info';
      default: return 'bg-light text-dark border';
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const paginatedUsers = safeUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card shadow-sm border">
      <TableFilterBar
        variant="embedded"
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={isSupervisor ? "Search operator ID, name or phone..." : "Search Employee ID, name, email or phone..."}
        loading={loading && !initialLoading}
        leftExtras={
          !isSupervisor && (
            <TableFilterSelect
              value={roleFilter}
              onChange={onRoleChange}
              icon="ti-user-shield"
              iconColorClass="text-primary"
              minWidth="150px"
              maxWidth="210px"
              title="Filter by Role"
            >
              <option value="">All Roles</option>
              {activeRoles.map((r, idx) => {
                const rName = r.role_name || r.name;
                return (
                  <option key={r.id || rName || idx} value={rName}>{rName}</option>
                );
              })}
            </TableFilterSelect>
          )
        }
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
        <SkeletonTable rows={6} columns={9} embedded />
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
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Assigned Role</th>
                  <th>Assigned Stage</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeUsers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ti ti-users-minus fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold">
                        {isSupervisor ? 'No operator users found matching your filters.' : 'Data not found'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, index) => (
                    <tr key={u.id}>
                      <td className="fw-semibold text-center text-secondary">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="fw-bold text-primary">{u.employee_id}</td>
                      <td className="fw-semibold text-dark">{u.name}</td>
                      <td className="text-muted">{u.email || '-'}</td>
                      <td className="text-muted small">{u.phone || '-'}</td>
                      <td>
                        <span className={`badge border px-2 py-1 ${getRoleBadgeClass(u.role)}`}>
                          {u.role === 'REPORT_VIEWER' ? 'Production Report User' : u.role}
                        </span>
                      </td>
                      <td>
                        {renderAssignedStageCell ? renderAssignedStageCell(u) : (u.stage_name || u.assigned_stages?.join(', ') || 'All Stages')}
                      </td>
                      <td>
                        <span className={`badge px-2 py-1 ${u.status === 'INACTIVE'
                          ? 'bg-secondary-subtle text-secondary border'
                          : 'bg-success-subtle text-success border border-success'
                          }`}>
                          <i className={`ti ${u.status === 'INACTIVE' ? 'ti-circle-x' : 'ti-circle-check'} me-1`}></i>
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          <button
                            onClick={() => onViewUser(u)}
                            className="btn btn-sm btn-action-view border-0"
                            title="View User Details"
                          >
                            <i className="ti ti-eye fs-5"></i>
                          </button>
                          {onReassignStages && (
                            <button
                              onClick={() => onReassignStages(u)}
                              className="btn btn-sm btn-action-assign border-0"
                              title="Assign Production Stages"
                            >
                              <i className="ti ti-layers-subtract fs-5"></i>
                            </button>
                          )}
                          {!isSupervisor && onEditUser && (
                            <button
                              onClick={() => onEditUser(u)}
                              className="btn btn-sm btn-action-edit border-0"
                              title="Edit User"
                            >
                              <i className="ti ti-edit fs-5"></i>
                            </button>
                          )}
                          {!isSupervisor && onDeleteUser && (
                            <button
                              onClick={() => onDeleteUser(u)}
                              className="btn btn-sm btn-action-delete border-0"
                              title="Delete User"
                            >
                              <i className="ti ti-trash fs-5"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={safeUsers.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
