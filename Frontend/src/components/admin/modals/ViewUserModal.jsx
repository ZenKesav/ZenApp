import React from 'react';
import { Modal } from '../../common/CommonComponents';

export default function ViewUserModal({
  isOpen,
  onClose,
  user
}) {
  if (!user) return null;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`User Profile Details: ${user.employee_id}`}>
      <div className="user-profile-view">
        <div className="card border-0 bg-primary-subtle p-3 mb-3 rounded-3">
          <div className="d-flex align-items-center gap-3">
            <div className="avatar-circle bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4 shadow-sm" style={{ width: '54px', height: '54px' }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="mb-1 text-primary-emphasis fw-bold">{user.name}</h4>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-primary text-white font-mono">{user.employee_id}</span>
                <span className={`badge border px-2 py-1 ${getRoleBadgeClass(user.role)}`}>
                  {user.role === 'REPORT_VIEWER' ? 'Production Report User' : user.role}
                </span>
                <span className={`badge px-2 py-1 ${user.status === 'INACTIVE'
                  ? 'bg-secondary-subtle text-secondary border'
                  : 'bg-success-subtle text-success border border-success'
                  }`}>
                  <i className={`ti ${user.status === 'INACTIVE' ? 'ti-circle-x' : 'ti-circle-check'} me-1`}></i>
                  {user.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card border shadow-none mb-3">
          <div className="card-header bg-light py-2 d-flex align-items-center">
            <i className="ti ti-user fs-5 me-2 text-primary"></i>
            <h6 className="mb-0 fw-bold text-dark">User Account Details</h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-3">
              <div className="col-md-6">
                <span className="text-muted small d-block">Employee ID</span>
                <strong className="text-dark font-mono fs-6">{user.employee_id}</strong>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Full Name</span>
                <strong className="text-dark fs-6">{user.name}</strong>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Gender</span>
                <span className={`badge px-2 py-1 ${user.gender === 'Female' ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-primary-subtle text-primary border border-primary-subtle'}`}>
                  <i className={`ti ${user.gender === 'Female' ? 'ti-gender-female' : 'ti-gender-male'} me-1`}></i>
                  {user.gender || 'Male'}
                </span>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Email</span>
                <span className="text-dark">{user.email || 'N/A'}</span>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Phone Number</span>
                <span className="text-dark font-mono">{user.phone || 'N/A'}</span>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Assigned Role</span>
                <span className="text-dark fw-bold">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
