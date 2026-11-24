import React, { useState, useRef, useEffect } from 'react';

export function Dropdown({ trigger, items = [], align = 'end', className = '' }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={`dropdown position-relative d-inline-block ${className}`} ref={dropdownRef}>
      <div
        role="button"
        tabIndex="0"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(!open); }}
      >
        {trigger}
      </div>
      {open && (
        <ul
          className={`dropdown-menu show shadow-lg border-0 rounded-3 p-1 position-absolute mt-1 ${
            align === 'end' ? 'dropdown-menu-end end-0' : 'start-0'
          }`}
          style={{ minWidth: '180px', zIndex: 1050 }}
        >
          {items.map((item, i) => (
            <li key={i}>
              {item.divider ? (
                <hr className="dropdown-divider my-1" />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (item.onClick) item.onClick();
                  }}
                  className={`dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 text-dark small ${
                    item.className || ''
                  }`}
                >
                  {item.icon && <i className={`${item.icon} text-muted`}></i>}
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;
