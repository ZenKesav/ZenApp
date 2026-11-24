import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../core/context/AuthContext';
import { roleService } from '../../services/admin/admin.service';
import RoleTable from '../../components/admin/tables/RoleTable';
import CreateRoleModal from '../../components/admin/modals/CreateRoleModal';
import EditRoleModal from '../../components/admin/modals/EditRoleModal';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../core/utils/swal';

export default function RolePermissionPage() {
  const { user } = useAuth();
  const currentUserEmail = user?.email || user?.employee_id || 'admin@zenmeter.com';

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const latestRolesReqRef = useRef(0);

  const loadRoles = (searchVal = searchTerm, statusVal = statusFilter) => {
    const reqId = ++latestRolesReqRef.current;
    setLoading(true);
    const params = {};
    if (searchVal && searchVal.trim()) params.search = searchVal.trim();
    if (statusVal && statusVal.trim()) params.status = statusVal.trim();

    roleService.getRoles(params).then(res => {
      if (reqId === latestRolesReqRef.current) {
        const fetchedRoles = Array.isArray(res) ? res : (res?.roles || res?.data || []);
        setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);
        setLoading(false);
        setInitialLoading(false);
      }
    }).catch(err => {
      if (reqId === latestRolesReqRef.current) {
        console.error('loadRoles Error:', err);
        setRoles([]);
        setLoading(false);
        setInitialLoading(false);
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRoles(searchTerm, statusFilter);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleCreateRole = async ({ roleName, roleDesc }, resetForm) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await roleService.createRole({
        role_name: roleName,
        name: roleName,
        role_description: roleDesc,
        description: roleDesc,
        created_by: currentUserEmail
      });
      const alertMsg = res?.message || `Role '${roleName}' created successfully!`;
      showSuccessAlert('Role Created', alertMsg);
      setIsCreateOpen(false);
      resetForm?.();
      loadRoles();
    } catch (err) {
      setError(err.message || 'Failed to create role.');
      showErrorAlert('Create Role Failed', err.message || 'Failed to create role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (roleObj) => {
    setEditingRole(roleObj);
    setIsEditOpen(true);
  };

  const handleUpdateRole = async ({ desc, status }) => {
    if (!editingRole) return;
    setSubmitting(true);
    try {
      const targetName = editingRole.role_name || editingRole.name;
      const targetIdentifier = editingRole.id || editingRole.role_id || targetName;
      const res = await roleService.updateRole(targetIdentifier, {
        role_name: targetName,
        name: targetName,
        role_description: desc,
        description: desc,
        status: status,
        updated_by: currentUserEmail
      });
      const alertMsg = res?.message || `Role '${targetName}' updated successfully!`;
      showSuccessAlert('Role Updated', alertMsg);
      setIsEditOpen(false);
      loadRoles();
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (targetRole) => {
    if (!targetRole) return;
    const targetName = targetRole.role_name || targetRole.name;
    const targetIdentifier = targetRole.id || targetRole.role_id || targetName;
    const confirmed = await showConfirmAlert({
      title: 'Delete System Role?',
      text: `Are you sure you want to delete role '${targetName}'? Users assigned to this role may lose authorization.`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete Role',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await roleService.deleteRole(targetIdentifier);
      const alertMsg = res?.message || `Role '${targetName}' deleted successfully!`;
      showSuccessAlert('Role Deleted', alertMsg);
      loadRoles();
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete role.');
    }
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-user-shield text-primary"></i>
              <span>Role Management</span>
            </h1>
          </div>
          <button
            className="btn btn-primary btn-sm fw-semibold shadow-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <i className="ti ti-plus me-1"></i> Create New Role
          </button>
        </div>
      </div>

      <RoleTable
        roles={roles}
        loading={loading}
        initialLoading={initialLoading}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
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
        onEditRole={handleOpenEdit}
        onDeleteRole={handleDeleteRole}
      />

      <CreateRoleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateRole}
        submitting={submitting}
        error={error}
      />

      <EditRoleModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        role={editingRole}
        onUpdate={handleUpdateRole}
        submitting={submitting}
      />
    </>
  );
}
