import React from 'react';
import { Modal } from '../../../common/CommonComponents';

export default function DuplicateImeiModal({
  isOpen,
  onClose,
  duplicates = []
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate IMEI Warning Detected">
      <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
        <i className="ti ti-alert-triangle fs-4 text-warning-emphasis"></i>
        <div>
          <strong>Potential Duplicate Devices Detected!</strong>
          <div className="small">The following IMEI numbers are already recorded in the database.</div>
        </div>
      </div>

      <div className="border rounded p-3 mb-3 bg-light font-mono text-xs">
        {duplicates.map((imei, idx) => (
          <div key={idx} className="d-flex justify-content-between py-1 border-bottom">
            <span>IMEI #{idx + 1}:</span>
            <strong className="text-danger">{imei}</strong>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-end">
        <button className="btn btn-secondary" onClick={onClose}>Acknowledge & Close</button>
      </div>
    </Modal>
  );
}
