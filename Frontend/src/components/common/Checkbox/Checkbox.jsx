import React from 'react';

export function Checkbox({ label, checked, onChange, className = '', id, ...props }) {
  const checkId = id || (label ? `check-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className={`form-check ${className}`}>
      <input
        type="checkbox"
        id={checkId}
        checked={checked}
        onChange={onChange}
        className="form-check-input cursor-pointer"
        {...props}
      />
      {label && (
        <label htmlFor={checkId} className="form-check-label fw-medium text-dark small cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}

export default Checkbox;
