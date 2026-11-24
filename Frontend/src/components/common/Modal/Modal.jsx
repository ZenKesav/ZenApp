import React, { useEffect } from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '540px',
  bodyClassName = 'p-4 max-vh-75 overflow-auto',
  bodyStyle = {}
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1060,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered mx-auto p-2 p-sm-0"
        style={{ maxWidth, width: '100%' }}
      >
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
            <h5 className="modal-title fs-6 fw-bold text-dark mb-0">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close dialog"
            ></button>
          </div>
          <div className={`modal-body ${bodyClassName || 'p-4 max-vh-75 overflow-auto'}`} style={bodyStyle}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
