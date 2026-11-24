import React from 'react';
import { useStage02NicTest } from '../../../hooks/stages/useStage02NicTest';
import RfShieldBoxToggle from '../../../components/stages/stage02-nic-pcb-test/hardware/RfShieldBoxToggle';
import ModemSerialConsole from '../../../components/stages/stage02-nic-pcb-test/hardware/ModemSerialConsole';
import SignalRssiGauge from '../../../components/stages/stage02-nic-pcb-test/SignalRssiGauge';
import ImeiScanner from '../../../components/stages/stage02-nic-pcb-test/ImeiScanner';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';

export default function Stage02Page() {
  const {
    shieldBoxClosed,
    setShieldBoxClosed,
    modemPortConnected,
    testRunning,
    rssi,
    rsrp,
    sinr,
    networkOperator,
    modemStatus,
    nicSerial,
    setNicSerial,
    imei,
    macAddress,
    records,
    loadingRecords,
    logs,
    runNicRfTest,
    fetchRecords
  } = useStage02NicTest();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      runNicRfTest();
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-wifi text-primary me-2"></i>
            Stage 02: NIC Card PCB & Cellular RF Telemetry Test
          </h4>
          <p className="text-secondary small mb-0">
            Pneumatic RF Shield Box interlock, 4G LTE-M / NB-IoT AT command validation, RSSI signal verification, and IMEI extraction.
          </p>
        </div>
        <div>
          <span className="badge bg-primary px-3 py-2 fs-6">
            Station-02 &bull; Active Work Order
          </span>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <RfShieldBoxToggle
            closed={shieldBoxClosed}
            onToggle={setShieldBoxClosed}
            disabled={testRunning}
          />

          {/* Scan NIC Barcode */}
          <div className="card shadow-sm border-0 bg-white mb-3">
            <div className="card-header bg-white border-bottom py-2">
              <span className="fw-bold text-dark">
                <i className="ti ti-barcode text-primary me-1"></i> Scan NIC Serial Number
              </span>
            </div>
            <div className="card-body p-3">
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="ti ti-scan"></i></span>
                <input
                  type="text"
                  className="form-control font-monospace fw-bold text-primary"
                  placeholder="Scan NIC QR/Barcode (e.g. NIC-ZM-8015)..."
                  value={nicSerial}
                  onChange={(e) => setNicSerial(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={testRunning}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-bold"
                  onClick={runNicRfTest}
                  disabled={testRunning || !nicSerial.trim()}
                >
                  <i className="ti ti-player-play me-1"></i>
                  {testRunning ? 'Testing RF...' : 'Run RF Test'}
                </button>
              </div>
            </div>
          </div>

          <SignalRssiGauge
            rssi={rssi}
            rsrp={rsrp}
            sinr={sinr}
            networkOperator={networkOperator}
            modemStatus={modemStatus}
          />
          <ImeiScanner imei={imei} macAddress={macAddress} />
        </div>

        <div className="col-lg-6">
          <ModemSerialConsole logs={logs} />
        </div>
      </div>

      {/* History Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 02 NIC Test History
            </h6>
            <small className="text-secondary">Recent NIC modules tested for RF sensitivity and IMEI binding</small>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={fetchRecords}
            disabled={loadingRecords}
          >
            <i className={`ti ti-refresh me-1 ${loadingRecords ? 'ti-spin' : ''}`}></i> Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-striped align-middle mb-0 text-nowrap">
            <thead className="table-light">
              <tr>
                <th scope="col" style={{ width: '50px' }}>#</th>
                <th scope="col">NIC Serial Number</th>
                <th scope="col">Modem IMEI</th>
                <th scope="col">Cellular RSSI</th>
                <th scope="col">Network Carrier</th>
                <th scope="col">Status</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="fw-bold font-monospace text-primary">{r.nic_serial || '-'}</td>
                  <td className="font-monospace small text-muted">{r.imei || '-'}</td>
                  <td><span className="badge bg-success-subtle text-success border font-monospace">{r.rssi || '-74 dBm'}</span></td>
                  <td><span className="badge bg-light text-dark border">{r.network || 'Airtel IoT'}</span></td>
                  <td><StatusBadge status={r.status || 'PASSED'} /></td>
                  <td className="small text-secondary">{r.time || 'Today'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
