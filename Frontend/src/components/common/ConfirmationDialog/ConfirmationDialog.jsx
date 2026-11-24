import React from 'react';
import Modal from '../Modal/Modal';

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  icon = 'ti ti-alert-triangle'
}) {
  if (!isOpen) return null;
  return (
    <Modal title={title} isOpen={isOpen} onClose={onClose} maxWidth="480px">
      <div className="d-flex align-items-start gap-3 mb-4">
        <div className={`p-2.5 rounded-circle bg-${confirmVariant === 'danger' ? 'danger' : 'primary'}-subtle text-${confirmVariant === 'danger' ? 'danger' : 'primary'} flex-shrink-0`}>
          <i className={`${icon} fs-4`}></i>
        </div>
        <div>
          <p className="text-secondary mb-0 fs-6 lh-base">{message}</p>
        </div>
      </div>
      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 pt-2 border-top">
        <button
          type="button"
          className="btn btn-outline-secondary px-4 py-2 fw-semibold rounded-3 order-2 order-sm-1"
          onClick={onClose}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn btn-${confirmVariant} px-4 py-2 fw-semibold rounded-3 shadow-xs order-1 order-sm-2`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmationDialog;
