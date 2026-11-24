import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function EditRoleModal({
  isOpen,
  onClose,
  role,
  onUpdate,
  submitting = false
}) {
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  useEffect(() => {
    if (role) {
      setEditDesc((role.role_description || role.description || '').trim());
      const isActive = role.status === true || role.status === 'ACTIVE' || role.status === 1 || role.status === 'true';
      setEditStatus(isActive ? 'ACTIVE' : 'INACTIVE');
    }
  }, [role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      desc: editDesc,
      status: editStatus === 'ACTIVE'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit System Role: ${role?.role_name || role?.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Role Description *</label>
          <textarea
            className="form-control"
            rows="3"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label className="form-label fw-semibold text-dark small">Role Status</label>
          <select
            className="form-select"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-2">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Updating Role...' : 'Save Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
