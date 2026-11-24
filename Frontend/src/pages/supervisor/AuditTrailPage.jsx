import React from 'react';
import { useSupervisorOverride } from '../../hooks/supervisor/useSupervisorOverride';
import StationAuditTable from '../../components/supervisor/tables/StationAuditTable';

export default function AuditTrailPage() {
  const { auditLogs, loadingAudit, fetchAuditLogs } = useSupervisorOverride();

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-shield-search text-primary me-2"></i> Line Supervisor Audit Trail
          </h4>
          <p className="text-secondary small mb-0">
            Cryptographic ledger of supervisor bypasses, station assignments, shift handovers, and retest approvals.
          </p>
        </div>
      </div>

      <StationAuditTable
        auditLogs={auditLogs}
        loading={loadingAudit}
        onRefresh={fetchAuditLogs}
      />
    </div>
  );
}
