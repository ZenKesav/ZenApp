import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function ReassignStagesModal({
  isOpen,
  onClose,
  user,
  activeStages = [],
  onSave,
  submitting = false,
  isSupervisor = false
}) {
  const [stages, setStages] = useState([]);

  useEffect(() => {
    if (user) {
      const st = Array.isArray(user.assigned_stages)
        ? user.assigned_stages.map(s => Number(typeof s === 'object' ? s.stage_number || s.id : s))
        : [];
      setStages(st);
    }
  }, [user]);

  const handleToggleStage = (stNo) => {
    setStages(prev =>
      prev.includes(stNo) ? prev.filter(s => s !== stNo) : [...prev, stNo]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(stages);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isSupervisor ? 'Assign Operator Stages' : 'Re-assign Stages'}: ${user?.name} (${user?.employee_id})`}
    >
      <form onSubmit={handleSubmit}>
        <div className={`alert ${isSupervisor ? 'alert-primary bg-primary-subtle border-primary-subtle' : 'alert-info'} py-2 px-3 small mb-3`}>
          <div className="d-flex align-items-center mb-1">
            <i className={`ti ${isSupervisor ? 'ti-shield-check text-primary' : 'ti-info-circle'} fs-5 me-2`}></i>
            <strong className="text-dark">
              {isSupervisor ? 'Supervisor Authorized Stages Scope' : 'Re-assign Stages'}
            </strong>
          </div>
          <div className="text-secondary">
            {isSupervisor ? (
              <>
                Assign production stages within your supervisor scope to operator <strong className="text-dark">{user?.name}</strong> ({user?.employee_id}). Tick the stages below and click <strong>Assign Stages</strong>.
              </>
            ) : (
              <>
                Re-assigning production stages for user <strong className="text-dark">{user?.name}</strong> ({user?.employee_id}). Tick or untick stages below.
              </>
            )}
          </div>
        </div>

        <div className="border rounded p-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {activeStages.map(st => {
            const num = Number(st.stage_number || st.id);
            return (
              <div key={num} className="form-check py-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`reassign_st_${num}`}
                  checked={stages.includes(num)}
                  onChange={() => handleToggleStage(num)}
                />
                <label className="form-check-label small" htmlFor={`reassign_st_${num}`}>
                  Stage #{num}: {st.stage_name || st.name}
                </label>
              </div>
            );
          })}
        </div>

        <div className="d-flex justify-content-end gap-2 pt-2 border-top mt-3">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            <i className="ti ti-check me-1"></i>{submitting ? 'Saving...' : (isSupervisor ? 'Assign Stages' : 'Save Stage Re-assignment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
