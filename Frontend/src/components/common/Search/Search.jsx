import React from 'react';

export function Search({ value, onChange, placeholder = 'Search...', className = '', onClear }) {
  return (
    <div className={`input-group ${className}`}>
      <span className="input-group-text bg-white border-end-0 text-muted ps-3">
        <i className="ti ti-search fs-6"></i>
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-control border-start-0 ps-1 rounded-end-3"
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y text-decoration-none pe-3"
          style={{ zIndex: 5 }}
          aria-label="Clear search"
        >
          <i className="ti ti-x"></i>
        </button>
      )}
    </div>
  );
}

export default Search;
