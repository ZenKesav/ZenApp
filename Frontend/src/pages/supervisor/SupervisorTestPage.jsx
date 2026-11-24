import React, { useState } from 'react';
import { useSupervisorOverride } from '../../hooks/supervisor/useSupervisorOverride';
import SupervisorTestTable from '../../components/supervisor/tables/SupervisorTestTable';
import SupervisorRecordModal from '../../components/supervisor/modals/SupervisorRecordModal';
import OverrideAuthModal from '../../components/supervisor/modals/OverrideAuthModal';

export default function SupervisorTestPage() {
  const {
    tests,
    loadingTests,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    statusFilter,
    setStatusFilter,
    selectedRecord,
    setSelectedRecord,
    showDetailModal,
    setShowDetailModal,
    showOverrideModal,
    setShowOverrideModal,
    targetMeter,
    setTargetMeter,
    fetchTests,
    submitOverride
  } = useSupervisorOverride();

  const [message, setMessage] = useState(null);

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleOverrideTrigger = (record) => {
    setTargetMeter(record);
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = async (data) => {
    const res = await submitOverride(data.meterNo, data.stageNumber, data.justification, data.pin);
    if (res.success) {
      setMessage({ type: 'success', text: `Stage failure successfully overridden for Meter ${data.meterNo}!` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'danger', text: res.error || 'Failed to authorize override' });
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-user-check text-warning me-2"></i> Supervisor Production Test Portal
          </h4>
          <p className="text-secondary small mb-0">
            Supervisor review console for test runs, yield audits, and stage failure retest authorizations.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchTests}
          disabled={loadingTests}
        >
          <i className={`ti ti-refresh me-1 ${loadingTests ? 'ti-spin' : ''}`}></i> Refresh Tests
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          <i className="ti ti-info-circle me-1"></i> {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light"><i className="ti ti-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by Meter No, Operator, or Test ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Production Stages</option>
                <option value="4">Stage 04 - NIC Inside Print</option>
                <option value="6">Stage 06 - Calibration</option>
                <option value="7">Stage 07 - Final Validation</option>
                <option value="9">Stage 09 - Meter Box Laser Print</option>
                <option value="10">Stage 10 - Carton Pack</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Test Statuses</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed (Requires Review)</option>
              </select>
            </div>
            <div className="col-md-1">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => { setSearch(''); setStageFilter(''); setStatusFilter(''); }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <SupervisorTestTable
        tests={tests}
        loading={loadingTests}
        onViewRecord={handleView}
        onOverride={handleOverrideTrigger}
      />

      {/* Modals */}
      <SupervisorRecordModal
        isOpen={showDetailModal}
        record={selectedRecord}
        onClose={() => setShowDetailModal(false)}
      />
      <OverrideAuthModal
        isOpen={showOverrideModal}
        target={targetMeter}
        onClose={() => setShowOverrideModal(false)}
        onConfirm={handleConfirmOverride}
      />
    </div>
  );
}
