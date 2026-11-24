import React from 'react';
import StatusBadge from '../StatusBadge/StatusBadge';

export function StageStatus({ stageId, stageName, status, className = '' }) {
  return (
    <div className={`d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border ${className}`}>
      <div className="d-flex align-items-center gap-2">
        <span className="badge bg-dark font-mono text-white px-2 py-1 small">Stage {stageId}</span>
        <span className="fw-semibold text-dark small">{stageName}</span>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

export default StageStatus;
