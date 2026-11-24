import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  icon,
  loading = false,
  ...props
}) {
  const getBtnClass = () => {
    switch (variant) {
      case 'primary': return 'btn btn-primary';
      case 'secondary': return 'btn btn-secondary';
      case 'outline-primary': return 'btn btn-outline-primary';
      case 'outline-secondary': return 'btn btn-outline-secondary';
      case 'danger': return 'btn btn-danger';
      case 'success': return 'btn btn-success';
      case 'light': return 'btn btn-light';
      default: return `btn btn-${variant}`;
    }
  };

  const sizeClass = size === 'sm' ? 'btn-sm py-1.5 px-3' : size === 'lg' ? 'btn-lg py-2.5 px-4' : 'py-2 px-3.5';

  return (
    <button
      type={type}
      className={`${getBtnClass()} ${sizeClass} fw-semibold rounded-3 d-inline-flex align-items-center justify-content-center gap-2 ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      ) : icon ? (
        <i className={icon}></i>
      ) : null}
      {children}
    </button>
  );
}

export default Button;
