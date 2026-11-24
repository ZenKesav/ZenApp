import React, { useState } from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import ReportDataTable from '../../components/analysis/tables/ReportDataTable';
import ReportExportButton from '../../components/analysis/buttons/ReportExportButton';
import ExportReportModal from '../../components/analysis/modals/ExportReportModal';

export default function DailyReportPage() {
  const {
    reportData,
    loadingReport,
    selectedDate,
    setSelectedDate,
    showExportModal,
    setShowExportModal,
    fetchReport
  } = useProductionReports();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-calendar-event text-primary me-2"></i> Daily Production & Yield Report
          </h4>
          <p className="text-secondary small mb-0">
            Shift-wise meter output, defect counts, first-pass yield, and station quarantine logs for the day.
          </p>
        </div>
        <ReportExportButton onOpenExport={() => setShowExportModal(true)} />
      </div>

      {/* Date Selector Bar */}
      <div className="card shadow-sm border-0 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light"><i className="ti ti-calendar"></i></span>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100"
                onClick={() => fetchReport('daily')}
              >
                Load Daily Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <ReportDataTable
        data={reportData}
        loading={loadingReport}
      />

      {/* Export Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={() => alert('Daily report export started!')}
      />
    </div>
  );
}
