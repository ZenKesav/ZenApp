import React from 'react';

export default function ProductionOverviewTable({ stages = [], loading = false }) {
  const defaultStages = [
    { id: '1', name: 'PCB Assembly & Visual Check', activeWO: 'WO-01-A', operator: 'Rajesh K', target: 1200, actual: 1180, cycleTime: '18s', status: 'ON_TRACK' },
    { id: '2', name: 'NIC Component Soldering', activeWO: 'WO-02-B', operator: 'Pooja M', target: 1200, actual: 1192, cycleTime: '22s', status: 'ON_TRACK' },
    { id: '4', name: 'NIC Inside Print & Jig Test', activeWO: 'WO-04-C', operator: 'Karthik S', target: 1200, actual: 1140, cycleTime: '28s', status: 'BOTTLENECK' },
    { id: '6', name: 'Automatic Metrology Calibration', activeWO: 'WO-06-A', operator: 'Automated Bench', target: 1200, actual: 1150, cycleTime: '35s', status: 'ON_TRACK' },
    { id: '7', name: 'Final Functional Validation', activeWO: 'WO-07-D', operator: 'Deepak N', target: 1200, actual: 1120, cycleTime: '26s', status: 'ON_TRACK' },
    { id: '8', name: 'PVC Ultrasonic Sealing', activeWO: 'WO-08-B', operator: 'Suresh R', target: 1200, actual: 1110, cycleTime: '15s', status: 'ON_TRACK' },
    { id: '9', name: 'Meter Box Laser Print & Optical', activeWO: 'WO-09-A', operator: 'Anil P', target: 1200, actual: 1098, cycleTime: '30s', status: 'ON_TRACK' },
    { id: '10', name: 'Carton Packaging & Box Barcode', activeWO: 'WO-10-C', operator: 'Manoj T', target: 1200, actual: 1080, cycleTime: '20s', status: 'ON_TRACK' },
    { id: '11', name: 'Master Pallet Pack & QC Dispatch', activeWO: 'WO-11-A', operator: 'Logistics Lead', target: 1200, actual: 1050, cycleTime: '40s', status: 'ON_TRACK' }
  ];

  const list = stages.length > 0 ? stages : defaultStages;

  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="table-responsive">
        <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '60px' }}>Stage #</th>
              <th scope="col">Stage Name & Description</th>
              <th scope="col">Active Work Order</th>
              <th scope="col">Assigned Operator</th>
              <th scope="col">Target</th>
              <th scope="col">Completed</th>
              <th scope="col">Line Progress</th>
              <th scope="col">Cycle Time</th>
              <th scope="col">Station Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-secondary">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading stage line balance data...
                </td>
              </tr>
            ) : (
              list.map((s) => {
                const target = s.target || 1200;
                const actual = s.actual || 1100;
                const pct = Math.min(100, Math.round((actual / target) * 100));

                return (
                  <tr key={s.id || s.stage_number}>
                    <td className="fw-bold text-center">
                      <span className="badge bg-secondary-subtle text-dark border">
                        {s.id || s.stage_number}
                      </span>
                    </td>
                    <td className="fw-semibold text-dark">{s.name || s.stage_name}</td>
                    <td><span className="badge bg-light text-dark border">{s.activeWO || 'WO-LINE-01'}</span></td>
                    <td className="small">{s.operator || 'Operator assigned'}</td>
                    <td className="text-secondary">{target}</td>
                    <td className="fw-bold text-primary">{actual}</td>
                    <td style={{ minWidth: '120px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-fill" style={{ height: '6px' }}>
                          <div
                            className={`progress-bar ${pct >= 95 ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="small text-muted">{pct}%</span>
                      </div>
                    </td>
                    <td className="font-monospace small text-secondary">{s.cycleTime || '25s'}</td>
                    <td>
                      {s.status === 'BOTTLENECK' ? (
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                          <i className="ti ti-alert-triangle me-1"></i> Bottleneck
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="ti ti-circle-check me-1"></i> Running Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
