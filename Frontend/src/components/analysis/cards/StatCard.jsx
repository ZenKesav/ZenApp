import React from 'react';

const StatCard = ({ title, value, changeText, variant = 'primary', icon = 'ti-report-analytics' }) => {
  const variantStyles = {
    primary: { bg: 'bg-primary-subtle', text: 'text-primary', border: 'border-primary-subtle' },
    success: { bg: 'bg-success-subtle', text: 'text-success', border: 'border-success-subtle' },
    warning: { bg: 'bg-warning-subtle', text: 'text-warning-emphasis', border: 'border-warning-subtle' },
    danger: { bg: 'bg-danger-subtle', text: 'text-danger', border: 'border-danger-subtle' },
    info: { bg: 'bg-info-subtle', text: 'text-info', border: 'border-info-subtle' }
  };

  const style = variantStyles[variant] || variantStyles.primary;

  return (
    <div className="card p-3 p-sm-4 bg-white shadow-xs rounded-4 h-100 glass-card">
      <div className="d-flex gap-3 align-items-center">
        <div
          className={`icon-shape ${style.bg} ${style.text} border ${style.border} rounded-3 d-flex align-items-center justify-content-center flex-shrink-0`}
          style={{ width: '48px', height: '48px' }}
        >
          <i className={`${icon} fs-4`}></i>
        </div>
        <div className="overflow-hidden">
          <h2 className="mb-1 fs-6 text-muted fw-semibold text-truncate">{title}</h2>
          <h3 className="fw-bold mb-0 fs-3 text-dark font-mono text-truncate">{value}</h3>
          {changeText && (
            <p className={`${style.text} mb-0 small fw-medium mt-1 text-truncate`}>
              {changeText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
