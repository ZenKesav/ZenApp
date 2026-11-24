import React from 'react';
import { Modal } from '../../../common/CommonComponents';

export default function PrintLabelModal({
  isOpen,
  onClose,
  channels = [],
  cycleUuid,
  onTriggerPrint,
  submitting = false
}) {
  const validChannels = channels.filter(c => c.imei && (c.st === 'PASS' || c.st === 'CON'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-printer text-primary fs-5"></i>
          <span>NIC Card Thermal Label Print Preview {cycleUuid ? `(${cycleUuid})` : ''}</span>
        </div>
      }
      size="lg"
    >
      <div className="mb-3">
        <p className="small text-muted mb-2">
          Ready to print 300 DPI 2D barcode labels for {validChannels.length} tested and verified NIC cards.
        </p>

        <div className="row g-2 mb-3" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {validChannels.map((c) => (
            <div key={c.ch} className="col-md-6">
              <div className="border rounded p-2.5 bg-light d-flex align-items-center gap-2.5">
                <div className="p-2 bg-white border rounded text-center" style={{ width: '50px', height: '50px' }}>
                  <i className="ti ti-qrcode fs-3 text-dark"></i>
                </div>
                <div className="font-mono text-2xs overflow-hidden">
                  <div className="fw-bold text-dark">CH {c.ch}: {c.imei}</div>
                  <div className="text-muted">HW: {c.hwv || 'V2.1'} | FW: {c.fwv || 'v1.4.2'}</div>
                  <div className="text-secondary text-truncate">{cycleUuid || 'NIC-LABEL'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 pt-2 border-top">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={onTriggerPrint}
          disabled={validChannels.length === 0 || submitting}
        >
          <i className="ti ti-printer me-1"></i>
          {submitting ? 'Printing Labels...' : `Print ${validChannels.length} Labels`}
        </button>
      </div>
    </Modal>
  );
}
