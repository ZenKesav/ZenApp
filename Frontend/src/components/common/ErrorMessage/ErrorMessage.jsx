import React from 'react';

export function ErrorMessage({ message, className = '' }) {
  if (!message) return null;
  return (
    <div className={`alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 small mb-3 ${className}`} role="alert">
      <i className="ti ti-alert-circle fs-5 flex-shrink-0"></i>
      <span>{message}</span>
    </div>
  );
}

export default ErrorMessage;
