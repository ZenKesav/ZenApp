import React from 'react';

const STATUS_BADGE_MAP = {
  PASS: 'badge-status-pass',
  COMPLETED: 'badge-status-pass',
  ACTIVE: 'badge-status-pass',
  FAIL: 'badge-status-fail',
  REJECTED: 'badge-status-fail',
  INACTIVE: 'bg-secondary-subtle text-secondary border',
  HOLD: 'badge-status-hold',
  WARNING: 'badge-status-hold',
  IN_PRODUCTION: 'badge-status-info',
  PENDING: 'badge-status-info',
  DUPLICATE: 'bg-warning-subtle text-warning-emphasis border border-warning'
};

const STATUS_ICONS = {
  PASS: 'ti-check',
  COMPLETED: 'ti-check',
  ACTIVE: 'ti-check',
  FAIL: 'ti-x',
  REJECTED: 'ti-x',
  HOLD: 'ti-alert-triangle',
  IN_PRODUCTION: 'ti-loader-2',
  PENDING: 'ti-clock'
};

export default function StatusBadge({ status, showIcon = true, className = '' }) {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');
  const badgeClass = STATUS_BADGE_MAP[norm] || 'bg-light text-dark border';
  const icon = STATUS_ICONS[norm];

  return (
    <span className={`badge font-mono ${badgeClass} ${className}`}>
      {showIcon && icon && <i className={`ti ${icon} me-1`}></i>}
      <span>{status || 'Unknown'}</span>
    </span>
  );
}
