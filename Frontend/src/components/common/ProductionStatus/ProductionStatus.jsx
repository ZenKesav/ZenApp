import React from 'react';

export function ProductionStatus({ total = 0, passed = 0, failed = 0, inProgress = 0, className = '' }) {
  const cards = [
    { label: 'Total Units', count: total, bg: 'bg-primary-subtle', text: 'text-primary', icon: 'ti ti-cpu' },
    { label: 'Passed', count: passed, bg: 'bg-success-subtle', text: 'text-success', icon: 'ti ti-circle-check' },
    { label: 'Failed', count: failed, bg: 'bg-danger-subtle', text: 'text-danger', icon: 'ti ti-circle-x' },
    { label: 'In Progress', count: inProgress, bg: 'bg-warning-subtle', text: 'text-warning-emphasis', icon: 'ti ti-clock' },
  ];

  return (
    <div className={`row g-3 w-100 ${className}`}>
      {cards.map((c, i) => (
        <div className="col-6 col-md-3" key={i}>
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-muted fw-semibold text-uppercase font-mono text-xs">{c.label}</span>
              <div className={`p-2 rounded-3 ${c.bg} ${c.text}`}>
                <i className={`${c.icon} fs-5`}></i>
              </div>
            </div>
            <div className={`fs-3 fw-bold ${c.text} font-mono mb-0`}>{c.count}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductionStatus;
