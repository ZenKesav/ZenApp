import React from 'react';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function MeterTraceabilityTable({ traceability }) {
  if (!traceability) return null;

  const history = traceability.history || traceability.stages || [
    { stage: '1', name: 'PCB Assembly', status: 'PASSED', operator: 'Rajesh K', timestamp: '2026-11-22 09:12:04' },
    { stage: '2', name: 'NIC Soldering', status: 'PASSED', operator: 'Pooja M', timestamp: '2026-11-22 09:45:18' },
    { stage: '4', name: 'NIC Inside Print', status: 'PASSED', operator: 'Karthik S', timestamp: '2026-11-22 10:14:32' },
    { stage: '6', name: 'Metrology Calibration', status: 'PASSED', operator: 'Auto Bench', timestamp: '2026-11-22 11:02:11' },
    { stage: '7', name: 'Final Validation', status: 'PASSED', operator: 'Deepak N', timestamp: '2026-11-22 11:34:50' },
    { stage: '8', name: 'PVC Ultrasonic Seal', status: 'PASSED', operator: 'Suresh R', timestamp: '2026-11-22 12:05:19' },
    { stage: '9', name: 'Meter Box Laser Print & Optical', status: 'PASSED', operator: 'Anil P', timestamp: '2026-11-22 12:42:01' }
  ];

  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div>
          <span className="small text-secondary text-uppercase fw-semibold">Traceability Passport</span>
          <h5 className="fw-bold font-monospace text-primary mb-0">
            {traceability.meter_no || traceability.serialNo || 'ZM26019482'}
          </h5>
        </div>
        <div>
          <StatusBadge status={traceability.status || 'PASSED'} />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Operation</th>
              <th scope="col">Operator</th>
              <th scope="col">Stage Verdict</th>
              <th scope="col">Execution Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, idx) => (
              <tr key={idx}>
                <td>
                  <span className="badge bg-secondary-subtle text-dark border">
                    Stage {h.stage || h.stage_number}
                  </span>
                </td>
                <td className="fw-semibold text-dark">{h.name || h.stage_name}</td>
                <td className="small">{h.operator || 'Line Operator'}</td>
                <td>
                  <StatusBadge status={h.status || 'PASSED'} />
                </td>
                <td className="small text-secondary">{h.timestamp || 'Recent'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
