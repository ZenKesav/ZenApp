import React, { useState } from 'react';
import { useQcInspection } from '../../hooks/qc/useQcInspection';
import QCInspectionTable from '../../components/qc/tables/QCInspectionTable';
import QCActionButtons from '../../components/qc/buttons/QCActionButtons';
import DefectTagModal from '../../components/qc/modals/DefectTagModal';
import HoldReasonModal from '../../components/qc/modals/HoldReasonModal';

export default function QCInspectionPage() {
  const {
    queue,
    loadingQueue,
    selectedMeter,
    setSelectedMeter,
    showDefectModal,
    setShowDefectModal,
    showHoldModal,
    setShowHoldModal,
    submitInspectionVerdict
  } = useQcInspection();

  const [message, setMessage] = useState(null);

  const handlePass = async () => {
    if (!selectedMeter) return;
    const res = await submitInspectionVerdict(selectedMeter, 'PASSED', 'Inspected and certified');
    if (res.success) {
      setMessage({ type: 'success', text: `Meter ${selectedMeter} successfully passed QC!` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleHoldSubmit = async (data) => {
    if (!selectedMeter) return;
    const res = await submitInspectionVerdict(selectedMeter, 'HOLD', data.reason);
    if (res.success) {
      setMessage({ type: 'warning', text: `Meter ${selectedMeter} placed in Quarantine Hold.` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRejectSubmit = async (data) => {
    if (!selectedMeter) return;
    const res = await submitInspectionVerdict(selectedMeter, 'FAILED', `${data.defectCategory}: ${data.description}`);
    if (res.success) {
      setMessage({ type: 'danger', text: `Meter ${selectedMeter} rejected and flagged for scrap.` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-scan text-primary me-2"></i> QC Live Inspection Console
          </h4>
          <p className="text-secondary small mb-0">
            Real-time visual and optical verification queue. Certify or quarantine meters before dispatch.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          <i className="ti ti-info-circle me-1"></i> {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="row g-3">
        {/* Left: Queue */}
        <div className="col-lg-5">
          <QCInspectionTable
            queue={queue}
            loading={loadingQueue}
            selectedMeter={selectedMeter}
            onSelectMeter={setSelectedMeter}
          />
        </div>

        {/* Right: Inspection Console */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 mb-3 bg-white">
            <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-dark">
                <i className="ti ti-microscope me-1 text-primary"></i> Active Inspection Target
              </span>
              <span className="badge bg-light text-dark font-monospace border">
                {selectedMeter || 'Select from Queue'}
              </span>
            </div>
            <div className="card-body p-4">
              {selectedMeter ? (
                <div>
                  <div className="text-center p-4 bg-light rounded border mb-3">
                    <span className="small text-secondary text-uppercase d-block mb-1">Meter Serial Number</span>
                    <h3 className="fw-bold font-monospace text-primary mb-2">{selectedMeter}</h3>
                    <div className="d-flex justify-content-center gap-2">
                      <span className="badge bg-success-subtle text-success border">Optical Handshake OK</span>
                      <span className="badge bg-info-subtle text-info border">Stage 09 Passed</span>
                      <span className="badge bg-secondary-subtle text-secondary border">Class 1.0</span>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-2">Inspection Protocol Checklist:</h6>
                  <ul className="list-group list-group-flush small mb-3">
                    <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <span><i className="ti ti-check text-success me-2"></i> Front plate laser marking crispness & alignment</span>
                      <span className="text-muted">Verified</span>
                    </li>
                    <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <span><i className="ti ti-check text-success me-2"></i> DLMS Optical head infrared communication response</span>
                      <span className="text-muted">Verified</span>
                    </li>
                    <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <span><i className="ti ti-check text-success me-2"></i> QR Code and 2D DataMatrix scanning rate</span>
                      <span className="text-muted">Grade A</span>
                    </li>
                    <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <span><i className="ti ti-check text-success me-2"></i> Polycarbonate ultrasonic weld & IP54 gasket seal</span>
                      <span className="text-muted">Intact</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="text-center py-5 text-secondary">
                  <i className="ti ti-arrow-left fs-1 text-primary d-block mb-2"></i>
                  Select a meter from the queue to start verification.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <QCActionButtons
            meterNo={selectedMeter}
            disabled={!selectedMeter}
            onPass={handlePass}
            onHold={() => setShowHoldModal(true)}
            onReject={() => setShowDefectModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <DefectTagModal
        isOpen={showDefectModal}
        meterNo={selectedMeter}
        onClose={() => setShowDefectModal(false)}
        onSubmit={handleRejectSubmit}
      />
      <HoldReasonModal
        isOpen={showHoldModal}
        meterNo={selectedMeter}
        onClose={() => setShowHoldModal(false)}
        onSubmit={handleHoldSubmit}
      />
    </div>
  );
}
