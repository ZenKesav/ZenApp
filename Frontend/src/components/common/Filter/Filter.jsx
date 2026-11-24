import React from 'react';

export function Filter({ children, className = '' }) {
  return <div className={`d-flex align-items-center gap-2.5 flex-wrap ${className}`}>{children}</div>;
}

export default Filter;
