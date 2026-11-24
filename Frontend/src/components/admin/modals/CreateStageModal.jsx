import React, { useState } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function CreateStageModal({
  isOpen,
  onClose,
  onCreate,
  submitting = false,
  nextStageNumber = 1
}) {
  const [stageNumber, setStageNumber] = useState(nextStageNumber);
  const [stageName, setStageName] = useState('');
  const [description, setDescription] = useState('');
  const [lineType, setLineType] = useState('Main Meter Assembly Line');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      stage_number: Number(stageNumber),
      stage_name: stageName,
      description,
      line_type: lineType,
      status: true
    }, () => {
      setStageName('');
      setDescription('');
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Production Stage">
      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold text-dark small">Stage Number *</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={stageNumber}
              onChange={(e) => setStageNumber(Number(e.target.value))}
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold text-dark small">Stage Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. PCB Code Loading Test"
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
            placeholder="e.g. Power & boot test, Code loading..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold text-dark small">Production Line Type *</label>
          <select
            className="form-select"
            value={lineType}
            onChange={(e) => setLineType(e.target.value)}
          >
            <option value="Main Meter Assembly Line">Main Meter Assembly Line</option>
            <option value="NIC Card Preparation Line">NIC Card Preparation Line</option>
          </select>
        </div>

        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating Stage...' : 'Create Stage'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
