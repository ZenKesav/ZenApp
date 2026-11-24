import React from 'react';
import StatusBadge from '../../../common/StatusBadge/StatusBadge';

export default function JigChannelTable({ channels = [], cycleUuid }) {
  return (
    <div className="card shadow-sm border mb-4">
      <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-table text-primary"></i>
          <span className="fw-bold text-dark small">Batch Telemetry Channel Summary</span>
        </div>
        {cycleUuid && <span className="badge bg-primary text-white font-mono">{cycleUuid}</span>}
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-striped mb-0 align-middle">
          <thead className="table-light small">
            <tr>
              <th className="text-center" style={{ width: '60px' }}>CH</th>
              <th>IMEI</th>
              <th>HW / FW</th>
              <th>SIM</th>
              <th>MAC</th>
              <th>Voltage / Current</th>
              <th>RSSI</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {channels.map((c) => (
              <tr key={c.ch}>
                <td className="text-center fw-bold">{c.ch}</td>
                <td className="fw-medium text-dark">{c.imei || '-'}</td>
                <td className="text-secondary">{c.hwv || '-'} / {c.fwv || '-'}</td>
                <td>{c.sim || '-'}</td>
                <td className="text-secondary">{c.mac || '-'}</td>
                <td>{c.volt || '-'} / {c.curr || '-'}</td>
                <td>{c.rssi || '-'}</td>
                <td className="text-center">
                  <StatusBadge status={c.st || 'NCON'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
