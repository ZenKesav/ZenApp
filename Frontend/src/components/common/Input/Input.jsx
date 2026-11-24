import React from 'react';

export function Input({ label, error, helperText, className = '', id, ...props }) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="mb-3 w-100">
      {label && (
        <label htmlFor={inputId} className="form-label fw-semibold text-dark small mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      />
      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
      {helperText && !error && <div className="form-text text-muted small mt-1">{helperText}</div>}
    </div>
  );
}

export default Input;
