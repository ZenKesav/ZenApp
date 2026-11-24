import React from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import ProductionOverviewTable from '../../components/analysis/tables/ProductionOverviewTable';

export default function DashboardPage() {
  const { overviewData, loadingOverview, summaryMetrics, fetchOverview } = useProductionReports();

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-dashboard text-primary me-2"></i> Production & Operations Dashboard
          </h4>
          <p className="text-secondary small mb-0">
            Real-time shopfloor telemetry, stage balance, and first-pass yield metrics across all lines.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchOverview}
          disabled={loadingOverview}
        >
          <i className={`ti ti-refresh me-1 ${loadingOverview ? 'ti-spin' : ''}`}></i> Refresh
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Total Produced (Shift)</span>
              <h2 className="fw-bold text-dark mb-1">{summaryMetrics.totalProduced.toLocaleString()}</h2>
              <span className="badge bg-primary-subtle text-primary small">
                <i className="ti ti-gauge me-1"></i> 98.4% of Daily Target
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">First Pass Yield (FPY)</span>
              <h2 className="fw-bold text-success mb-1">{summaryMetrics.overallYield}</h2>
              <span className="badge bg-success-subtle text-success small">
                <i className="ti ti-circle-check me-1"></i> Stage 04 & Stage 09 Compliant
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Active Work Orders</span>
              <h2 className="fw-bold text-primary mb-1">{summaryMetrics.activeWorkOrders}</h2>
              <span className="badge bg-info-subtle text-info small">
                <i className="ti ti-file-text me-1"></i> Running across 11 Stages
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3">
              <span className="small text-secondary fw-semibold text-uppercase">Average Cycle Time</span>
              <h2 className="fw-bold text-dark mb-1">{summaryMetrics.averageCycleTime}</h2>
              <span className="badge bg-secondary-subtle text-secondary small">
                <i className="ti ti-clock me-1"></i> Target: &le; 30s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Production Line Balance Table */}
      <div className="mb-3">
        <h6 className="fw-bold text-dark mb-2">
          <i className="ti ti-git-fork me-1 text-primary"></i> Stage-by-Stage Line Balance & Progress
        </h6>
        <ProductionOverviewTable
          stages={overviewData}
          loading={loadingOverview}
        />
      </div>
    </div>
  );
}
