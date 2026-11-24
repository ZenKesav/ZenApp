import React from 'react';

export function TestResultBadge({ result, className = '' }) {
  if (result === 'PASS') {
    return (
      <div className={`p-3 p-sm-4 bg-success-subtle border border-success-subtle rounded-4 text-center ${className}`}>
        <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
          <i className="ti ti-circle-check fs-2 text-success"></i>
          <span className="fs-2 fw-black text-success tracking-wider font-mono">PASS</span>
        </div>
        <p className="small text-success-emphasis font-mono mb-0">All hardware &amp; threshold criteria satisfied</p>
      </div>
    );
  }
  if (result === 'HOLD') {
    return (
      <div className={`p-3 p-sm-4 bg-warning-subtle border border-warning-subtle rounded-4 text-center ${className}`}>
        <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
          <i className="ti ti-alert-triangle fs-2 text-warning-emphasis"></i>
          <span className="fs-2 fw-black text-warning-emphasis tracking-wider font-mono">HOLD</span>
        </div>
        <p className="small text-warning-emphasis font-mono mb-0">Supervisor / Engineering review required</p>
      </div>
    );
  }
  return (
    <div className={`p-3 p-sm-4 bg-danger-subtle border border-danger-subtle rounded-4 text-center ${className}`}>
      <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
        <i className="ti ti-circle-x fs-2 text-danger"></i>
        <span className="fs-2 fw-black text-danger tracking-wider font-mono">FAIL</span>
      </div>
      <p className="small text-danger font-mono mb-0">Hardware test parameter out of tolerance</p>
    </div>
  );
}

export default TestResultBadge;
