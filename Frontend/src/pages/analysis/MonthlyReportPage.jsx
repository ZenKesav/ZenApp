import React, { useState } from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import ReportDataTable from '../../components/analysis/tables/ReportDataTable';
import ReportExportButton from '../../components/analysis/buttons/ReportExportButton';
import ExportReportModal from '../../components/analysis/modals/ExportReportModal';

export default function MonthlyReportPage() {
  const {
    reportData,
    loadingReport,
    selectedMonth,
    setSelectedMonth,
    showExportModal,
    setShowExportModal,
    fetchReport
  } = useProductionReports();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-calendar-stats text-primary me-2"></i> Monthly Yield & Aggregation Report
          </h4>
          <p className="text-secondary small mb-0">
            Month-to-date cumulative yield analysis, total batch output, and quality compliance metrics.
          </p>
        </div>
        <ReportExportButton onOpenExport={() => setShowExportModal(true)} />
      </div>

      {/* Month Selector Bar */}
      <div className="card shadow-sm border-0 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light"><i className="ti ti-calendar"></i></span>
                <input
                  type="month"
                  className="form-control"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100"
                onClick={() => fetchReport('monthly')}
              >
                Load Monthly Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportDataTable
        data={reportData}
        loading={loadingReport}
      />

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={() => alert('Monthly report export started!')}
      />
    </div>
  );
}
