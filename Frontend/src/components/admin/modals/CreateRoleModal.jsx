import React, { useState } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function CreateRoleModal({
  isOpen,
  onClose,
  onCreate,
  submitting = false,
  error = ''
}) {
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ roleName, roleDesc }, () => {
      setRoleName('');
      setRoleDesc('');
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create System Authorization Role">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Role Name *</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. AUDITOR"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value.toUpperCase())}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Role Description *</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="Enter details of role authorization scope..."
            value={roleDesc}
            onChange={(e) => setRoleDesc(e.target.value)}
            required
          ></textarea>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-2">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating Role...' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
