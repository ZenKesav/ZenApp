import React from 'react';

export function Button({ children, variant = 'primary', className = '', loading = false, disabled = false, ...props }) {
  const btnVariants = {
    primary: 'btn-primary',
    secondary: 'btn-outline-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    warning: 'btn-warning'
  };

  return (
    <button
      className={`btn ${btnVariants[variant] || 'btn-primary'} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="d-flex align-items-center justify-content-center gap-2">
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="mb-3 w-100">
      {label && <label className="form-label fw-semibold text-dark small">{label}</label>}
      <input
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, size = 'default', maxWidth, dialogStyle = {}, children }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isXxl = size === 'xxl' || size === '2xl';
  const sizeClass = isXxl ? 'modal-xl' : size === 'xl' ? 'modal-xl' : size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';

  const combinedDialogStyle = {
    ...(isXxl ? { maxWidth: maxWidth || '1160px', width: '92vw' } : {}),
    ...(maxWidth && !isXxl ? { maxWidth, width: '92vw' } : {}),
    ...dialogStyle
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}
    >
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClass}`} style={combinedDialogStyle}>
        <div className="modal-content shadow-lg border-0 rounded-3" style={{ maxHeight: '92vh' }}>
          <div className="modal-header border-bottom px-3 px-sm-4 py-3 bg-white d-flex align-items-center justify-content-between">
            <h5 className="modal-title fw-bold text-dark mb-0 text-truncate pe-2">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close modal dialog"
            ></button>
          </div>
          <div className="modal-body p-3 p-sm-4 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ text = 'Loading data...' }) {
  return (
    <div className="p-4 p-sm-5 text-center my-4">
      <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted fw-medium small mb-0">{text}</p>
    </div>
  );
}

const SKELETON_HEADER_WIDTHS = ['58%', '64%', '54%', '70%', '60%', '52%', '62%', '48%'];
const SKELETON_CELL_WIDTHS = ['76%', '62%', '84%', '68%', '74%', '58%', '80%', '66%'];
const SKELETON_CHART_HEIGHTS = [42, 68, 54, 82, 48, 76, 62, 88, 52, 72, 60, 84];

function SkeletonTableCell({ colIndex, totalColumns, rowIndex }) {
  const isFirst = colIndex === 0;
  const isLast = colIndex === totalColumns - 1;
  const isBadgeCol = colIndex === 1 || (totalColumns >= 5 && colIndex === totalColumns - 2);
  const widthPct = SKELETON_CELL_WIDTHS[(colIndex + rowIndex) % SKELETON_CELL_WIDTHS.length];

  if (isFirst) {
    return (
      <div className="d-flex justify-content-center">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '26px' }} />
      </div>
    );
  }

  if (isLast && totalColumns >= 4) {
    return (
      <div className="d-flex align-items-center justify-content-end gap-2">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--pill" style={{ width: '64px' }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--circle" />
      </div>
    );
  }

  if (isBadgeCol) {
    return (
      <span
        className="zen-skeleton-shimmer zen-skeleton-shimmer--pill"
        style={{ width: colIndex === 1 ? '94px' : '74px' }}
      />
    );
  }

  if ((colIndex + rowIndex) % 3 === 0) {
    return (
      <div className="d-flex flex-column gap-1">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: widthPct }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--subbar" style={{ width: '48%' }} />
      </div>
    );
  }

  return <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: widthPct }} />;
}

export function SkeletonTable({ rows = 6, columns = 6, embedded = false }) {
  const safeRows = Math.max(1, rows);
  const safeColumns = Math.max(1, columns);

  const tableContent = (
    <div className="table-responsive" aria-busy="true" aria-label="Loading table data">
      <table className="table mb-0 align-middle zen-skeleton-table">
        <thead className="table-light">
          <tr>
            {Array.from({ length: safeColumns }).map((_, i) => (
              <th key={i} className={i === 0 ? 'text-center' : i === safeColumns - 1 ? 'text-end pe-4' : ''}>
                <span
                  className="zen-skeleton-shimmer zen-skeleton-shimmer--header"
                  style={{ width: i === 0 ? '32px' : SKELETON_HEADER_WIDTHS[i % SKELETON_HEADER_WIDTHS.length] }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: safeRows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: safeColumns }).map((_, c) => (
                <td key={c} className={c === safeColumns - 1 ? 'pe-4' : ''}>
                  <SkeletonTableCell colIndex={c} totalColumns={safeColumns} rowIndex={r} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (embedded) {
    return tableContent;
  }

  return (
    <div className="card shadow-xs table-card border">
      {tableContent}
    </div>
  );
}

export function SkeletonCard({ height = '180px' }) {
  return (
    <div className="card shadow-xs border p-3 p-sm-4 bg-white" style={{ minHeight: height }} aria-busy="true">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '38%', height: '14px' }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--pill" style={{ width: '20%', height: '16px' }} />
      </div>
      <div className="d-flex flex-column gap-2 mb-3">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '96%', height: '14px' }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '76%', height: '13px' }} />
      </div>
      <hr className="my-2 border-light" />
      <div className="d-flex align-items-center justify-content-between pt-1 mt-auto">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '30%', height: '13px' }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--circle" />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = '350px' }) {
  return (
    <div className="card shadow-xs border p-3 p-sm-4 bg-white" aria-busy="true">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--bar" style={{ width: '28%', height: '16px' }} />
        <span className="zen-skeleton-shimmer zen-skeleton-shimmer--pill" style={{ width: '16%', height: '22px' }} />
      </div>
      <div className="d-flex align-items-end justify-content-between gap-2" style={{ height: height }}>
        {SKELETON_CHART_HEIGHTS.map((pct, i) => (
          <div key={i} className="flex-fill d-flex align-items-end h-100">
            <span
              className="zen-skeleton-shimmer w-100"
              style={{ height: `${pct}%`, borderRadius: '6px 6px 2px 2px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  const options = Array.from(new Set([...pageSizeOptions, Number(pageSize)])).sort((a, b) => a - b);

  // Windowed pagination items
  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items = [1];
    if (currentPage > 3) {
      items.push('ellipsis-start');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    if (currentPage < totalPages - 2) {
      items.push('ellipsis-end');
    }
    if (totalPages > 1) {
      items.push(totalPages);
    }
    return items;
  };

  const paginationItems = getPaginationItems();

  return (
    <div className={`pagination-bar d-flex flex-wrap align-items-center justify-content-between gap-2 gap-sm-3 px-3 border-top bg-white rounded-bottom font-sans ${className}`}>
      <div className="d-flex align-items-center gap-2 small text-secondary flex-wrap">
        <span>
          Showing <strong className="text-dark">{startItem}</strong> - <strong className="text-dark">{endItem}</strong> of <strong className="text-dark">{totalItems}</strong> entries
        </span>
        {onPageSizeChange && (
          <select
            className="form-select form-select-sm ms-sm-1 pagination-select"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Items per page"
          >
            {options.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>

      <nav aria-label="Table navigation" className="ms-auto">
        <ul className="pagination pagination-sm mb-0 align-items-center">
          <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link d-inline-flex align-items-center gap-1"
              onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <i className="ti ti-chevron-left"></i>
              <span>Prev</span>
            </button>
          </li>
          {paginationItems.map((item, idx) => {
            if (typeof item === 'string') {
              return (
                <li key={`ellipsis-${idx}`} className="page-item disabled">
                  <span className="page-link border-0 bg-transparent text-muted px-1.5">&hellip;</span>
                </li>
              );
            }
            return (
              <li key={item} className={`page-item ${currentPage === item ? 'active' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange && onPageChange(item)}
                >
                  {item}
                </button>
              </li>
            );
          })}
          <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link d-inline-flex align-items-center gap-1"
              onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <span>Next</span>
              <i className="ti ti-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function TestResultBadge({ result }) {
  if (result === 'PASS') {
    return (
      <div className="p-3 bg-success-subtle border border-success text-success rounded-3 text-center space-y-1">
        <span className="fs-3 fw-bold tracking-wider d-block">PASS</span>
        <small className="d-block text-success fw-medium">All hardware & threshold criteria satisfied</small>
      </div>
    );
  }
  if (result === 'HOLD') {
    return (
      <div className="p-3 bg-warning-subtle border border-warning text-warning-emphasis rounded-3 text-center space-y-1">
        <span className="fs-3 fw-bold tracking-wider d-block">HOLD</span>
        <small className="d-block text-warning-emphasis fw-medium">Supervisor / Engineering review required</small>
      </div>
    );
  }
  return (
    <div className="p-3 bg-danger-subtle border border-danger text-danger rounded-3 text-center space-y-1">
      <span className="fs-3 fw-bold tracking-wider d-block">FAIL</span>
      <small className="d-block text-danger fw-medium">Hardware test parameter out of tolerance</small>
    </div>
  );
}

export function validatePasswordCriteria(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 12) {
    return { isValid: false, message: 'Password must not exceed 12 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 numeric digit (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 special character (e.g. @, #, $, %, !).' };
  }
  return { isValid: true, message: '' };
}

export function PasswordRequirements({ password = '', isTouched = false }) {
  if (!isTouched && !password) return null;

  const pwd = String(password || '');
  const rules = [
    { label: '8 - 12 Characters', valid: pwd.length >= 8 && pwd.length <= 12 },
    { label: '1 Uppercase (A-Z)', valid: /[A-Z]/.test(pwd) },
    { label: '1 Lowercase (a-z)', valid: /[a-z]/.test(pwd) },
    { label: '1 Numeric digit (0-9)', valid: /[0-9]/.test(pwd) },
    { label: '1 Special char (@#$%)', valid: /[^A-Za-z0-9]/.test(pwd) }
  ];

  const allValid = rules.every(r => r.valid);

  return (
    <div
      className={`mt-2 p-2.5 rounded-3 border transition-all ${
        allValid ? 'bg-success-subtle border-success-subtle text-success' : 'bg-light border-secondary-subtle'
      }`}
      style={{ fontSize: '0.78rem' }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-light-subtle">
        <span className="fw-semibold text-dark d-flex align-items-center" style={{ fontSize: '0.78rem' }}>
          <i className="ti ti-shield-lock me-1.5 text-primary fs-6"></i>Password Requirements:
        </span>
        <span
          className={`badge font-mono px-2 py-0.5 ${
            pwd.length >= 8 && pwd.length <= 12
              ? 'bg-success text-white'
              : pwd.length > 12
              ? 'bg-danger text-white'
              : 'bg-secondary text-white'
          }`}
          style={{ fontSize: '0.7rem' }}
        >
          {pwd.length}/12 Chars
        </span>
      </div>
      <div className="row g-1.5">
        {rules.map((rule, idx) => (
          <div key={idx} className="col-6 d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
            {rule.valid ? (
              <i className="ti ti-check text-success fw-bold me-1"></i>
            ) : (
              <i className="ti ti-x text-danger fw-bold me-1"></i>
            )}
            <span className={rule.valid ? 'text-success fw-semibold' : 'text-muted'}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact single-row search and filter toolbar for data tables.
 */
export function TableFilterBar({
  searchValue = '',
  onSearchChange,
  onSearchClear,
  searchPlaceholder = 'Search...',
  loading = false,
  spinnerClassName = 'text-primary',
  searchMinWidth = '145px',
  searchMaxWidth = '235px',
  leftExtras = null,
  rightExtras = null,
  variant = 'card',
  className = ''
}) {
  const handleClear = () => {
    if (onSearchClear) {
      onSearchClear();
    } else if (onSearchChange) {
      onSearchChange('');
    }
  };

  const searchInputGroup = (
    <div
      className="input-group input-group-sm"
      style={{ flex: '1 1 175px', minWidth: searchMinWidth, maxWidth: searchMaxWidth }}
    >
      <span className="input-group-text bg-white border-end-0 text-muted px-2">
        {loading ? (
          <span
            className={`spinner-border spinner-border-sm ${spinnerClassName}`}
            style={{ width: '0.8rem', height: '0.8rem' }}
            role="status"
          ></span>
        ) : (
          <i className="ti ti-search" style={{ fontSize: '0.9rem' }}></i>
        )}
      </span>
      <input
        type="text"
        className="form-control form-control-sm border-start-0 shadow-none text-truncate"
        placeholder={searchPlaceholder}
        title={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      {searchValue && (
        <button
          type="button"
          className="btn btn-sm btn-light border border-start-0 px-2 text-muted"
          style={{ borderColor: 'var(--border-focus)' }}
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          <i className="ti ti-x" style={{ fontSize: '0.8rem' }}></i>
        </button>
      )}
    </div>
  );

  const rowContent = (
    <div className="d-flex flex-wrap flex-md-nowrap align-items-center justify-content-between gap-2">
      <div className="d-flex flex-wrap flex-sm-nowrap align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
        {searchInputGroup}
        {leftExtras}
      </div>
      {rightExtras && (
        <div className="d-flex flex-wrap flex-sm-nowrap align-items-center gap-2 flex-shrink-0 ms-md-auto">
          {rightExtras}
        </div>
      )}
    </div>
  );

  if (variant === 'embedded') {
    return (
      <div className={`px-3 py-2 bg-light-subtle rounded-top border-bottom ${className}`}>
        {rowContent}
      </div>
    );
  }

  if (variant === 'plain') {
    return <div className={className}>{rowContent}</div>;
  }

  return (
    <div className={`card shadow-xs border mb-3 ${className}`}>
      <div className="card-body px-3 py-2">{rowContent}</div>
    </div>
  );
}

/**
 * Compact icon-prefixed dropdown select for table filter bars (Stage, Role, etc.).
 */
export function TableFilterSelect({
  value = '',
  onChange,
  icon = 'ti-subtask',
  iconColorClass = 'text-primary',
  minWidth = '155px',
  maxWidth = '250px',
  title,
  ariaLabel,
  children
}) {
  return (
    <div
      className="input-group input-group-sm"
      style={{ flex: '0 1 250px', minWidth, maxWidth }}
    >
      <span className={`input-group-text bg-white border-end-0 ${iconColorClass} px-2`}>
        <i className={`ti ${icon}`} style={{ fontSize: '0.95rem' }}></i>
      </span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="form-select form-select-sm border-start-0 fw-semibold text-dark shadow-none text-truncate"
        style={{ cursor: 'pointer' }}
        title={title}
        aria-label={ariaLabel || title}
      >
        {children}
      </select>
    </div>
  );
}

/**
 * Compact inline Status dropdown for table filter bars.
 */
export function TableStatusSelect({
  value = '',
  onChange,
  options = [],
  label = 'Status',
  minWidth = '120px'
}) {
  return (
    <div className="input-group input-group-sm flex-nowrap" style={{ width: 'auto' }}>
      {label && (
        <span
          className="input-group-text bg-light text-muted fw-semibold text-uppercase border-end-0 px-2"
          style={{ fontSize: '0.7rem', letterSpacing: '0.03em' }}
        >
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`form-select form-select-sm ${label ? 'border-start-0' : ''} fw-semibold text-dark shadow-none`}
        style={{ width: 'auto', minWidth, cursor: 'pointer' }}
        aria-label={label || 'Status filter'}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}



export { default as StatusBadge } from './StatusBadge/StatusBadge';
