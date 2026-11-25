import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function EditUserModal({
  isOpen,
  onClose,
  user,
  activeRoles = [],
  activeStages = [],
  onUpdate,
  submitting = false
}) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [assignedStages, setAssignedStages] = useState([]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGender(user.gender || 'Male');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || 'OPERATOR');
      setStatus(user.status || 'ACTIVE');
      const st = Array.isArray(user.assigned_stages)
        ? user.assigned_stages.map(s => Number(typeof s === 'object' ? s.stage_number || s.id : s))
        : [];
      setAssignedStages(st);
    }
  }, [user]);

  const isFullStageAccessRole = (rName) => {
    if (!rName) return false;
    const norm = rName.toUpperCase();
    return (
      norm.includes('ADMIN') ||
      norm.includes('QC') ||
      norm.includes('REPORT') ||
      norm.includes('VIEWER')
    );
  };

  const handleToggleStage = (stNo) => {
    setAssignedStages(prev =>
      prev.includes(stNo) ? prev.filter(s => s !== stNo) : [...prev, stNo]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      name,
      gender,
      email,
      phone,
      role,
      status,
      assigned_stages: isFullStageAccessRole(role) ? [] : assignedStages
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${user?.employee_id}`}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Full Name *</label>
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Gender *</label>
          <div className="d-flex align-items-center gap-4 pt-1">
            <div className="form-check me-2">
              <input
                className="form-check-input"
                type="radio"
                name="editUserGender"
                id="editGenderMale"
                value="Male"
                checked={gender === 'Male'}
                onChange={(e) => setGender(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small fw-medium text-dark ms-1" htmlFor="editGenderMale" style={{ cursor: 'pointer' }}>
                <i className="ti ti-gender-male text-primary me-1"></i>Male
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="editUserGender"
                id="editGenderFemale"
                value="Female"
                checked={gender === 'Female'}
                onChange={(e) => setGender(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small fw-medium text-dark ms-1" htmlFor="editGenderFemale" style={{ cursor: 'pointer' }}>
                <i className="ti ti-gender-female text-danger me-1"></i>Female
              </label>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Email Address</label>
          <input
            className="form-control"
            type="email"
            value={email}
            readOnly
            style={{ cursor: 'default', backgroundColor: '#fff' }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Phone Number (10 Digits)</label>
          <input
            className="form-control"
            type="text"
            maxLength={10}
            value={phone}
            readOnly
            style={{ cursor: 'default', backgroundColor: '#fff' }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Assigned Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="form-select" required>
            {activeRoles.map((r, idx) => {
              const rName = r.role_name || r.name;
              return <option key={r.id || rName || idx} value={rName}>{rName}</option>;
            })}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Account Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {!isFullStageAccessRole(role) && activeStages.length > 0 && (
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Assigned Stages</label>
            <div className="border rounded p-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {activeStages.map(st => {
                const num = Number(st.stage_number || st.id);
                return (
                  <div key={num} className="form-check py-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`stage_edit_${num}`}
                      checked={assignedStages.includes(num)}
                      onChange={() => handleToggleStage(num)}
                    />
                    <label className="form-check-label small" htmlFor={`stage_edit_${num}`}>
                      Stage #{num}: {st.stage_name || st.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
