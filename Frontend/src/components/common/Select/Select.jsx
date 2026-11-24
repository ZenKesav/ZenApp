import React from 'react';

export function Select({ label, options = [], value, onChange, className = '', id, error, ...props }) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="mb-3 w-100">
      {label && (
        <label htmlFor={selectId} className="form-label fw-semibold text-dark small mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className={`form-select ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
            {typeof opt === 'object' ? opt.label : opt}
          </option>
        ))}
      </select>
      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
    </div>
  );
}

export default Select;
