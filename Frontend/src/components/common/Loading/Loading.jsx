import React from 'react';

export function LoadingSpinner({ text = 'Loading data...', className = '' }) {
  return (
    <div className={`p-4 p-sm-5 text-center my-3 ${className}`}>
      <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted fw-medium small mb-0">{text}</p>
    </div>
  );
}

export default LoadingSpinner;
