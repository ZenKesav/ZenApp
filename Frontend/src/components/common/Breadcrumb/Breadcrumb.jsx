import React from 'react';
import { Link } from 'react-router-dom';

export function Breadcrumb({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className={`py-2 ${className}`}>
      <ol className="breadcrumb mb-0 small">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={index}
              className={`breadcrumb-item ${isLast ? 'active fw-semibold text-dark' : ''}`}
              aria-current={isLast ? 'page' : undefined}
            >
              {item.link && !isLast ? (
                <Link to={item.link} className="text-decoration-none text-muted hover:text-primary">
                  {item.icon && <i className={`${item.icon} me-1`}></i>}
                  {item.label}
                </Link>
              ) : (
                <span>
                  {item.icon && <i className={`${item.icon} me-1`}></i>}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
