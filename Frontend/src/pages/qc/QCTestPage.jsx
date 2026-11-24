import React, { useState } from 'react';
import { useQcInspection } from '../../hooks/qc/useQcInspection';
import QCTestTable from '../../components/qc/tables/QCTestTable';
import QCTestDetailModal from '../../components/qc/modals/QCTestDetailModal';

export default function QCTestPage() {
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
    fetchTests
  } = useQcInspection();

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-checklist text-primary me-2"></i> Quality Control Test Portal
          </h4>
          <p className="text-secondary small mb-0">
            Audit test results, sample logs, and inspect optical/laser verification across all production stages.
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
                  placeholder="Search by Meter No, Test ID, or Inspector..."
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
                <option value="">All QC Statuses</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
                <option value="HOLD">Quarantine Hold</option>
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
      <QCTestTable
        tests={tests}
        loading={loadingTests}
        onViewRecord={handleView}
      />

      {/* Detail Modal */}
      <QCTestDetailModal
        isOpen={showDetailModal}
        record={selectedRecord}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}
