import React from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import ReportDataTable from '../../components/analysis/tables/ReportDataTable';
import ReportExportButton from '../../components/analysis/buttons/ReportExportButton';
import ExportReportModal from '../../components/analysis/modals/ExportReportModal';

export default function CustomReportPage() {
  const {
    reportData,
    loadingReport,
    dateRange,
    setDateRange,
    showExportModal,
    setShowExportModal,
    fetchReport
  } = useProductionReports();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-adjustments-alt text-primary me-2"></i> Custom Parametric Report
          </h4>
          <p className="text-secondary small mb-0">
            Define custom date ranges, multi-stage parameters, and export detailed telemetry archives.
          </p>
        </div>
        <ReportExportButton onOpenExport={() => setShowExportModal(true)} />
      </div>

      <div className="card shadow-sm border-0 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div className="col-md-2 d-flex flex-column justify-content-end">
              <label className="form-label small fw-semibold text-secondary mb-1">&nbsp;</label>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fetchReport('custom')}
              >
                Query Report
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
        onExport={() => alert('Custom report export started!')}
      />
    </div>
  );
}
