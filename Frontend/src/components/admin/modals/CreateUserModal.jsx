import React, { useState } from 'react';
import { Modal, PasswordRequirements } from '../../common/CommonComponents';

export default function CreateUserModal({
  isOpen,
  onClose,
  onCreate,
  activeRoles = [],
  activeStages = [],
  submitting = false,
  error = ''
}) {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(activeRoles.length > 0 ? (activeRoles[0].role_name || activeRoles[0].name) : 'OPERATOR');
  const [assignedStages, setAssignedStages] = useState([]);

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
    onCreate({
      employee_id: empId,
      name,
      gender,
      password,
      email,
      phone,
      role,
      assigned_stages: isFullStageAccessRole(role) ? [] : assignedStages
    }, () => {
      setEmpId('');
      setName('');
      setPassword('');
      setEmail('');
      setPhone('');
      setAssignedStages([]);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create System User Account">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Employee ID *</label>
          <input className="form-control" placeholder="e.g. EMP006" value={empId} onChange={(e) => setEmpId(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Full Name *</label>
          <input className="form-control" placeholder="e.g. Alex Operator" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Gender *</label>
          <div className="d-flex align-items-center gap-4 pt-1">
            <div className="form-check me-2">
              <input
                className="form-check-input"
                type="radio"
                name="createUserGender"
                id="createGenderMale"
                value="Male"
                checked={gender === 'Male'}
                onChange={(e) => setGender(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small fw-medium text-dark ms-1" htmlFor="createGenderMale" style={{ cursor: 'pointer' }}>
                <i className="ti ti-gender-male text-primary me-1"></i>Male
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="createUserGender"
                id="createGenderFemale"
                value="Female"
                checked={gender === 'Female'}
                onChange={(e) => setGender(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small fw-medium text-dark ms-1" htmlFor="createGenderFemale" style={{ cursor: 'pointer' }}>
                <i className="ti ti-gender-female text-danger me-1"></i>Female
              </label>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Password *</label>
          <div className="input-group">
            <input
              className="form-control border-end-0"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              maxLength={12}
              value={password}
              onFocus={() => setPasswordTouched(true)}
              onChange={(e) => {
                setPassword(e.target.value.slice(0, 12));
                setPasswordTouched(true);
              }}
              required
            />
            <button
              type="button"
              className="input-group-text bg-light border-start-0 text-muted"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
              style={{ cursor: 'pointer' }}
            >
              <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
            </button>
          </div>
          <PasswordRequirements password={password} isTouched={passwordTouched || password.length > 0} />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Email Address (Optional)</label>
          <input className="form-control" type="email" placeholder="alex@zenmeter.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Phone Number (10 Digits)</label>
          <input
            className="form-control"
            type="text"
            placeholder="e.g. 9876543210"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Select Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="form-select"
            required
          >
            {activeRoles.length > 0 ? (
              activeRoles.map((r, idx) => {
                const rName = r.role_name || r.name;
                const rDesc = r.role_description || r.description;
                return (
                  <option key={r.id || rName || idx} value={rName}>
                    {rName}{rDesc ? ` - ${rDesc}` : ''}
                  </option>
                );
              })
            ) : (
              <>
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="OPERATOR">Operator</option>
                <option value="QC">QC Tester</option>
                <option value="REPORT_VIEWER">Report Viewer</option>
              </>
            )}
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
                      id={`stage_create_${num}`}
                      checked={assignedStages.includes(num)}
                      onChange={() => handleToggleStage(num)}
                    />
                    <label className="form-check-label small" htmlFor={`stage_create_${num}`}>
                      Stage #{num}: {st.stage_name || st.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 pt-2">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating User...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
