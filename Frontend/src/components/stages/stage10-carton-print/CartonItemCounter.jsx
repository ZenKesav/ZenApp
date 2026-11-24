import React from 'react';

export default function CartonItemCounter({ meterSerial = '' }) {
  const checklist = [
    { name: 'Zenmeter 1-Phase Smart Meter Unit', weight: '~385g', checked: Boolean(meterSerial) },
    { name: 'Extended Terminal Cover & Sealing Screws', weight: '~45g', checked: true },
    { name: 'Factory Calibration Test Certificate (IS 16444)', weight: '~10g', checked: true },
    { name: 'User Safety & Installation Quick Guide', weight: '~15g', checked: true },
    { name: 'Die-Cut Corrugated Carton Box & Cushion', weight: '~30g', checked: true }
  ];

  return (
    <div className="card shadow-sm border-0 bg-white mb-3">
      <div className="card-header bg-white py-2 border-bottom d-flex align-items-center justify-content-between">
        <span className="fw-bold text-dark">
          <i className="ti ti-checklist text-primary me-1"></i> Individual Box Packaging Checklist
        </span>
        <span className="badge bg-primary-subtle text-primary border border-primary font-mono text-xs">
          Target ~485g
        </span>
      </div>
      <div className="card-body p-3">
        <div className="vstack gap-2 font-mono text-xs">
          {checklist.map((item, idx) => (
            <div key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
              <div className="d-flex align-items-center">
                <i className={`ti ${item.checked ? 'ti-circle-check text-success' : 'ti-circle text-muted'} me-2 fs-6`}></i>
                <span className={item.checked ? 'text-dark fw-semibold' : 'text-muted'}>{item.name}</span>
              </div>
              <span className="text-secondary">{item.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
