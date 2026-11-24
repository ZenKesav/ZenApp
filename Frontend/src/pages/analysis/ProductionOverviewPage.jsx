import React from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import ProductionOverviewTable from '../../components/analysis/tables/ProductionOverviewTable';

export default function ProductionOverviewPage() {
  const { overviewData, loadingOverview, fetchOverview } = useProductionReports();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-layout-grid text-primary me-2"></i> Production Line Overview
          </h4>
          <p className="text-secondary small mb-0">
            Real-time balance across Stages 1 through 11: operator assignments, active work orders, and throughput.
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

      <ProductionOverviewTable
        stages={overviewData}
        loading={loadingOverview}
      />
    </div>
  );
}
