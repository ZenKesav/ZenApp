import React, { useState } from 'react';
import { useProductionReports } from '../../hooks/analysis/useProductionReports';
import MeterTraceabilityTable from '../../components/analysis/tables/MeterTraceabilityTable';

export default function MeterTraceabilityPage() {
  const {
    searchMeterNo,
    setSearchMeterNo,
    traceability,
    loadingTraceability,
    searchTraceability
  } = useProductionReports();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchMeterNo) {
      searchTraceability(searchMeterNo);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-history text-primary me-2"></i> Meter Passport & Complete Traceability
          </h4>
          <p className="text-secondary small mb-0">
            Query complete production history, operator execution, and QA test results for any meter serial number.
          </p>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3 bg-white">
        <div className="card-body p-3">
          <form onSubmit={handleSearch}>
            <div className="row g-2 align-items-center">
              <div className="col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light"><i className="ti ti-barcode"></i></span>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Enter Meter Serial Number (e.g. ZM26019482)..."
                    value={searchMeterNo}
                    onChange={(e) => setSearchMeterNo(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="col-md-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-100"
                  disabled={loadingTraceability}
                >
                  <i className="ti ti-search me-1"></i>
                  {loadingTraceability ? 'Searching...' : 'Trace Meter'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {loadingTraceability ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary small mt-2">Retrieving meter passport across all stages...</p>
        </div>
      ) : traceability ? (
        <MeterTraceabilityTable traceability={traceability} />
      ) : (
        <div className="card border-0 shadow-sm text-center py-5 bg-white">
          <div className="card-body">
            <i className="ti ti-search fs-1 text-secondary d-block mb-2"></i>
            <h6 className="fw-bold text-dark mb-1">Enter a Meter Serial Number to view its history</h6>
            <p className="text-secondary small mb-0">
              Query will retrieve stages completed, optical probe logs, laser markings, and QC sign-offs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
