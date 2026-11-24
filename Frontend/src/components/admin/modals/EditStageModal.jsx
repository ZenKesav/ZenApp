import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function EditStageModal({
  isOpen,
  onClose,
  stage,
  onUpdate,
  submitting = false
}) {
  const [stageNumber, setStageNumber] = useState(1);
  const [stageName, setStageName] = useState('');
  const [description, setDescription] = useState('');
  const [lineType, setLineType] = useState('Main Meter Assembly Line');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    if (stage) {
      setStageNumber(stage.stage_number || stage.id || 1);
      setStageName(stage.stage_name || '');
      setDescription(stage.description || '');
      setLineType(stage.line_type || 'Main Meter Assembly Line');
      const isActive = stage.status === true || stage.status === 'true' || stage.status === 'ACTIVE' || stage.status === 1 || stage.status === '1';
      setStatus(isActive ? 'ACTIVE' : 'INACTIVE');
    }
  }, [stage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      stage_number: Number(stageNumber),
      stage_name: stageName,
      description,
      line_type: lineType,
      status: status === 'ACTIVE'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Stage #${stage?.stage_number}: ${stage?.stage_name || ''}`}>
      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold text-dark small">Stage Number *</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={stageNumber}
              onChange={(e) => setStageNumber(e.target.value)}
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold text-dark small">Stage Name *</label>
            <input
              type="text"
              className="form-control"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small">Process Description</label>
          <textarea
            className="form-control"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold text-dark small">Line Type</label>
            <select
              className="form-select"
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
            >
              <option value="Main Meter Assembly Line">Main Meter Assembly Line</option>
              <option value="NIC Card Preparation Line">NIC Card Preparation Line</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold text-dark small">Status</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

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
