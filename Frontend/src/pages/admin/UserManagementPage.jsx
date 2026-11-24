import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../core/context/AuthContext';
import { userService, roleService, stageManagementService } from '../../services/admin/admin.service';
import UserTable from '../../components/admin/tables/UserTable';
import CreateUserModal from '../../components/admin/modals/CreateUserModal';
import EditUserModal from '../../components/admin/modals/EditUserModal';
import ReassignStagesModal from '../../components/admin/modals/ReassignStagesModal';
import ViewUserModal from '../../components/admin/modals/ViewUserModal';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../core/utils/swal';
import { getUserAssignedStages } from '../../core/utils/stageUtils';

export default function UserManagementPage() {
  const { user } = useAuth();
  const rawRole = user?.role || '';
  const normRole = rawRole.toUpperCase().replace(/\s+/g, '_');
  const isAdmin = normRole === 'ADMIN' || normRole.includes('ADMIN') || normRole.includes('IT');
  const isSupervisor = (normRole === 'SUPERVISOR' || normRole.includes('SUPERVISOR')) && !isAdmin;

  const [users, setUsers] = useState([]);
  const [activeRoles, setActiveRoles] = useState([]);
  const [activeStages, setActiveStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const latestReqRef = useRef(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassigningUser, setReassigningUser] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = (searchVal = searchTerm, rFilter = roleFilter, sFilter = statusFilter) => {
    const reqId = ++latestReqRef.current;
    setLoading(true);

    const params = {};
    if (searchVal && searchVal.trim()) params.search = searchVal.trim();
    if (rFilter && rFilter.trim()) params.role = rFilter.trim();
    if (sFilter && sFilter.trim()) params.status = sFilter.trim();

    Promise.all([
      userService.getUsers(params),
      roleService.getRoles().catch(() => ({ roles: [] })),
      stageManagementService.getStages().catch(() => ({ stages: [] }))
    ]).then(([usersRes, rolesRes, stagesRes]) => {
      if (reqId === latestReqRef.current) {
        const uList = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data || []);
        const rList = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.roles || rolesRes?.data || []);
        const sList = Array.isArray(stagesRes) ? stagesRes : (stagesRes?.stages || stagesRes?.data || []);

        setUsers(Array.isArray(uList) ? uList : []);
        setActiveRoles(Array.isArray(rList) ? rList : []);
        setActiveStages(Array.isArray(sList) ? sList : []);
        setLoading(false);
        setInitialLoading(false);
      }
    }).catch(err => {
      if (reqId === latestReqRef.current) {
        console.error('loadUsers Error:', err);
        setUsers([]);
        setLoading(false);
        setInitialLoading(false);
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(searchTerm, roleFilter, statusFilter);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleCreateUser = async (formData, resetCallback) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await userService.createUser(formData);
      showSuccessAlert('User Created', res?.message || 'New user account created successfully!');
      setIsCreateOpen(false);
      resetCallback?.();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
      showErrorAlert('Create Failed', err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (formData) => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await userService.updateUser(editingUser.id, formData);
      showSuccessAlert('User Updated', res?.message || 'User account updated successfully!');
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReassign = async (assignedStageIds) => {
    if (!reassigningUser) return;
    setSubmitting(true);
    try {
      const res = await userService.updateUser(reassigningUser.id, {
        assigned_stages: assignedStageIds
      });
      showSuccessAlert('Stages Assigned', res?.message || 'Stages successfully updated for operator!');
      setIsReassignOpen(false);
      loadData();
    } catch (err) {
      showErrorAlert('Assignment Failed', err.message || 'Failed to update assigned stages.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!targetUser) return;
    const confirmed = await showConfirmAlert({
      title: 'Delete User Account?',
      text: `Are you sure you want to delete user ${targetUser.name} (${targetUser.employee_id})?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await userService.deleteUser(targetUser.id);
      showSuccessAlert('User Deleted', res?.message || 'User account removed.');
      loadData();
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete user.');
    }
  };

  const renderAssignedStageCell = (u) => {
    const norm = (u?.role || '').toUpperCase();
    if (norm.includes('ADMIN') || norm.includes('QC') || norm.includes('REPORT') || norm.includes('VIEWER')) {
      return <span className="badge bg-light text-secondary border">All Stages Authorized</span>;
    }
    const st = getUserAssignedStages(u);
    if (!st || st.length === 0) {
      return <span className="text-muted small">None Assigned</span>;
    }
    return (
      <div className="d-flex flex-wrap gap-1">
        {st.slice(0, 3).map(s => {
          const num = s.stage_number || s.id;
          return (
            <span key={num} className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
              Stage #{num}
            </span>
          );
        })}
        {st.length > 3 && (
          <span className="badge bg-secondary-subtle text-secondary">+{st.length - 3} more</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-users text-primary"></i>
              <span>User Management</span>
            </h1>
          </div>
          {!isSupervisor && (
            <button
              className="btn btn-primary btn-sm fw-semibold shadow-sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <i className="ti ti-plus me-1"></i> Add New User
            </button>
          )}
        </div>
      </div>

      <UserTable
        users={users}
        loading={loading}
        initialLoading={initialLoading}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        roleFilter={roleFilter}
        onRoleChange={(val) => {
          setRoleFilter(val);
          setCurrentPage(1);
        }}
        activeRoles={activeRoles}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        onViewUser={(u) => {
          setViewingUser(u);
          setIsViewOpen(true);
        }}
        onEditUser={(u) => {
          setEditingUser(u);
          setIsEditOpen(true);
        }}
        onReassignStages={(u) => {
          setReassigningUser(u);
          setIsReassignOpen(true);
        }}
        onDeleteUser={handleDeleteUser}
        isSupervisor={isSupervisor}
        renderAssignedStageCell={renderAssignedStageCell}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateUser}
        activeRoles={activeRoles}
        activeStages={activeStages}
        submitting={submitting}
        error={error}
      />

      <EditUserModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={editingUser}
        activeRoles={activeRoles}
        activeStages={activeStages}
        onUpdate={handleUpdateUser}
        submitting={submitting}
      />

      <ReassignStagesModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        user={reassigningUser}
        activeStages={activeStages}
        onSave={handleSaveReassign}
        submitting={submitting}
        isSupervisor={isSupervisor}
      />

      <ViewUserModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        user={viewingUser}
      />
    </>
  );
}
