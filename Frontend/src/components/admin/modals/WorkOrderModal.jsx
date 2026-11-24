import React, { useState } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function WorkOrderModal({
  isOpen,
  onClose,
  operators = [],
  stages = [],
  onAssign,
  submitting = false,
  error = ''
}) {
  const [selectedOperator, setSelectedOperator] = useState(operators[0]?.employee_id || '');
  const [selectedStage, setSelectedStage] = useState(stages[0]?.stage_number || '1');
  const [stationId, setStationId] = useState('JIG-01');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAssign({
      employee_id: selectedOperator || (operators[0]?.employee_id || ''),
      stage_id: Number(selectedStage),
      station_id: stationId
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Operator to Production Stage">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Select Operator *</label>
          <select
            className="form-select"
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            required
          >
            {operators.map(op => (
              <option key={op.employee_id} value={op.employee_id}>
                {op.name} ({op.employee_id})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Production Stage *</label>
          <select
            className="form-select"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            required
          >
            {stages.map(s => {
              const num = s.stage_number || s.id;
              return (
                <option key={num} value={num}>
                  Stage #{num}: {s.stage_name || s.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold text-dark small">Station / Hardware ID</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. JIG-01"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Assigning...' : 'Assign Operator'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
