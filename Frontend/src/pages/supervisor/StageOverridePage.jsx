import React, { useState } from 'react';
import { useSupervisorOverride } from '../../hooks/supervisor/useSupervisorOverride';
import SupervisorActionButtons from '../../components/supervisor/buttons/SupervisorActionButtons';
import OverrideAuthModal from '../../components/supervisor/modals/OverrideAuthModal';

export default function StageOverridePage() {
  const { submitOverride } = useSupervisorOverride();
  const [meterNo, setMeterNo] = useState('');
  const [stageNumber, setStageNumber] = useState('09');
  const [justification, setJustification] = useState('Re-calibrated test fixture');
  const [pin, setPin] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!meterNo || !pin) return;
    setSubmitting(true);
    const res = await submitOverride(meterNo, stageNumber, justification, pin);
    setSubmitting(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Stage ${stageNumber} override authorized for Meter ${meterNo}. Retest unlocked.` });
      setMeterNo('');
      setPin('');
    } else {
      setStatusMsg({ type: 'danger', text: res.error || 'Failed to authorize override' });
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-shield-lock text-warning me-2"></i> Stage Failure Override Console
          </h4>
          <p className="text-secondary small mb-0">
            Emergency bypass & failure clearing authorization for production stages with supervisor cryptographic sign-off.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className={`alert alert-${statusMsg.type} alert-dismissible fade show`} role="alert">
          <i className="ti ti-info-circle me-1"></i> {statusMsg.text}
          <button type="button" className="btn-close" onClick={() => setStatusMsg(null)}></button>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="ti ti-key me-1 text-warning"></i> Authorize Single Meter Override
              </h6>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleManualOverride}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Target Meter Serial Number</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="e.g. ZM26019482"
                    value={meterNo}
                    onChange={(e) => setMeterNo(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Target Production Stage</label>
                  <select
                    className="form-select"
                    value={stageNumber}
                    onChange={(e) => setStageNumber(e.target.value)}
                  >
                    <option value="04">Stage 04 - NIC Inside Print</option>
                    <option value="06">Stage 06 - Automatic Calibration</option>
                    <option value="07">Stage 07 - Final Validation</option>
                    <option value="09">Stage 09 - Meter Box Laser Print</option>
                    <option value="10">Stage 10 - Carton Pack</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Engineering Justification</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Reason for manual failure override..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-secondary">Supervisor Authorization PIN</label>
                  <input
                    type="password"
                    className="form-control font-monospace"
                    placeholder="Enter Supervisor PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-warning w-100 py-2 shadow-sm text-dark fw-bold"
                  disabled={submitting}
                >
                  <i className="ti ti-shield-check me-1"></i>
                  {submitting ? 'Verifying Authorization...' : 'Submit Cryptographic Override'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 bg-light h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-2">
                <i className="ti ti-alert-triangle text-warning me-1"></i> Override Protocol Guidelines
              </h6>
              <p className="small text-secondary mb-3">
                Overriding a stage failure resets the meter's quarantine lock and allows the station operator to re-run the calibration or marking sequence.
              </p>
              <ul className="small text-secondary ps-3 mb-0">
                <li className="mb-2">Ensure the underlying physical defect (e.g. dirty optical probe, misaligned barcode) has been rectified.</li>
                <li className="mb-2">Overrides are logged immutably in the central compliance audit trail.</li>
                <li>Maximum 2 overrides permitted per meter serial number before mandatory scrap disposition.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
