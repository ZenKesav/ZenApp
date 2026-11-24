import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Stage02HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('ALL');

  const mockHistory = [
    { id: 1, serial: 'NIC-2026-8801', imei: '862045051234567', rssi: -68, rsrp: -92, sinr: 18.2, status: 'PASS', operator: 'Jio 4G', timestamp: '2026-11-22 14:12:05', operatorName: 'Ramesh K' },
    { id: 2, serial: 'NIC-2026-8802', imei: '862045051234568', rssi: -71, rsrp: -95, sinr: 16.5, status: 'PASS', operator: 'Airtel IoT', timestamp: '2026-11-22 14:15:30', operatorName: 'Ramesh K' },
    { id: 3, serial: 'NIC-2026-8803', imei: '862045051234569', rssi: -108, rsrp: -122, sinr: 2.1, status: 'FAIL', operator: 'Vi India', timestamp: '2026-11-22 14:18:12', operatorName: 'Ramesh K' },
    { id: 4, serial: 'NIC-2026-8804', imei: '862045051234570', rssi: -65, rsrp: -89, sinr: 21.0, status: 'PASS', operator: 'Jio 4G', timestamp: '2026-11-22 14:21:44', operatorName: 'Ramesh K' },
    { id: 5, serial: 'NIC-2026-8805', imei: '862045051234571', rssi: -74, rsrp: -98, sinr: 14.8, status: 'PASS', operator: 'Airtel IoT', timestamp: '2026-11-22 14:24:19', operatorName: 'Ramesh K' }
  ];

  const filtered = mockHistory.filter((item) => {
    const matchSearch = item.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.imei.includes(searchTerm);
    const matchStatus = filterResult === 'ALL' || item.status === filterResult;
    return matchSearch && matchStatus;
  });

  return (
    <div className="container-fluid py-3">
      {/* Top Breadcrumb & Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/stages/2" className="btn btn-sm btn-outline-secondary py-0 px-2">
              <i className="ti ti-arrow-left me-1"></i> Back to Stage 02
            </Link>
            <span className="badge bg-primary-subtle text-primary">Stage 02 Module</span>
          </div>
          <h4 className="fw-bold text-dark mb-0">
            <i className="ti ti-history text-primary me-2"></i>
            Stage 02: NIC RF Test History & Audit Trail
          </h4>
          <p className="text-secondary small mb-0">
            Comprehensive history of all NIC cellular cards tested, RF telemetry parameters (RSSI, RSRP, SINR), and IMEI registrations.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/stages/2/calibration" className="btn btn-outline-primary btn-sm">
            <i className="ti ti-adjustments-alt me-1"></i> RF Shield Calibration
          </Link>
          <Link to="/stages/2" className="btn btn-primary btn-sm">
            <i className="ti ti-player-play me-1"></i> Live Production Test
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body py-2 px-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ti ti-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search NIC Serial or IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
              >
                <option value="ALL">All Test Results (Pass & Fail)</option>
                <option value="PASS">Pass Only</option>
                <option value="FAIL">Fail Only</option>
              </select>
            </div>
            <div className="col-md-4 text-end">
              <span className="text-muted small me-2">
                Showing <strong>{filtered.length}</strong> of {mockHistory.length} records
              </span>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setSearchTerm(''); setFilterResult('ALL'); }}>
                <i className="ti ti-refresh me-1"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase fs-xs">
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>NIC Serial Number</th>
                <th>Cellular IMEI</th>
                <th>Network Operator</th>
                <th>RSSI (dBm)</th>
                <th>RSRP (dBm)</th>
                <th>SINR (dB)</th>
                <th>Result</th>
                <th>Operator</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-muted small">{idx + 1}</td>
                  <td>
                    <span className="fw-semibold text-primary font-monospace">{item.serial}</span>
                  </td>
                  <td>
                    <span className="font-monospace text-dark">{item.imei}</span>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">{item.operator}</span>
                  </td>
                  <td>
                    <span className={`fw-semibold ${item.rssi >= -85 ? 'text-success' : 'text-danger'}`}>
                      {item.rssi} dBm
                    </span>
                  </td>
                  <td>
                    <span className="text-secondary">{item.rsrp} dBm</span>
                  </td>
                  <td>
                    <span className="text-secondary">{item.sinr} dB</span>
                  </td>
                  <td>
                    <span className={`badge ${item.status === 'PASS' ? 'bg-success' : 'bg-danger'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="small text-muted">{item.operatorName}</td>
                  <td className="small text-muted">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
