import React, { useState } from 'react';
import { Modal } from '../../common/CommonComponents';

export default function CreateShiftModal({
  isOpen,
  onClose,
  onCreate,
  submitting = false,
  error = ''
}) {
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');

  const calculateDuration = (start, end) => {
    if (!start || !end) return 8;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let mins = (eH * 60 + eM) - (sH * 60 + sM);
    if (mins <= 0) mins += 24 * 60;
    return parseFloat((mins / 60).toFixed(1));
  };

  const duration = calculateDuration(startTime, endTime);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      shift_name: shiftName,
      start_time: startTime,
      end_time: endTime,
      duration_hours: duration
    }, () => {
      setShiftName('');
      setStartTime('08:00');
      setEndTime('16:00');
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Work Shift Schedule" size="lg">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small mb-1">Shift Name *</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Morning Shift"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            required
          />
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold text-dark small mb-1">Start Time *</label>
            <input
              type="time"
              className="form-control font-mono"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold text-dark small mb-1">End Time *</label>
            <input
              type="time"
              className="form-control font-mono"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small mb-1">Shift Duration (Hours)</label>
          <input
            type="text"
            className="form-control bg-light fw-bold font-mono text-primary"
            value={`${duration} Hours`}
            readOnly
          />
        </div>

        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating Shift...' : 'Create Shift'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
