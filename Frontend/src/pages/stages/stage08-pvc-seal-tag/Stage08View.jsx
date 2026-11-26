import React from 'react';
import { STAGE_08_FIELDS } from './stage08.constants';

export default function Stage08View({ viewingForm }) {
  if (!viewingForm) return null;

  return (
    <div className="mb-3 pb-3 border-bottom">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold text-dark mb-0">PVC Seal Field Status</h6>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono text-xs">
          Stage 08
        </span>
      </div>
      <div className="row g-2">
        {STAGE_08_FIELDS.map(({ key, label }) => {
          const isActive = viewingForm.print_config?.stage08FieldStatuses?.[key] ?? true;
          return (
            <div className="col-md-6" key={key}>
              <div className="d-flex align-items-center justify-content-between gap-3 border-bottom px-2 py-2">
                <span className="fs-6 fw-normal text-dark">{label}</span>
                <span
                  className={`badge fs-6 ${
                    isActive
                      ? 'bg-success-subtle text-success border border-success-subtle'
                      : 'bg-secondary-subtle text-secondary border'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
