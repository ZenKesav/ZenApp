import React from 'react';
import { useStage01CodeLoading } from '../../../hooks/stages/useStage01CodeLoading';
import JigClampControl from '../../../components/stages/stage01-pcb-code-loading/hardware/JigClampControl';
import ProgrammerStatusLed from '../../../components/stages/stage01-pcb-code-loading/hardware/ProgrammerStatusLed';
import HexFileUploader from '../../../components/stages/stage01-pcb-code-loading/HexFileUploader';
import ChipUidDisplay from '../../../components/stages/stage01-pcb-code-loading/ChipUidDisplay';
import BootLogConsole from '../../../components/stages/stage01-pcb-code-loading/BootLogConsole';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';

export default function Stage01Page() {
  const {
    clampEngaged,
    setClampEngaged,
    programmerConnected,
    programmerStatus,
    firmwareVersion,
    checksum,
    pcbSerial,
    setPcbSerial,
    chipUid,
    progress,
    isFlashing,
    records,
    loadingRecords,
    logs,
    startFlashing,
    fetchRecords
  } = useStage01CodeLoading();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      startFlashing();
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="ti ti-code text-primary me-2"></i>
            Stage 01: PCB Code Loading & Automated MCU Flashing
          </h4>
          <p className="text-secondary small mb-0">
            JIG-01 SWD flashing fixture, Renesas/STM32 MCU firmware programming, SHA-256 verification, and 96-bit chip UID registration.
          </p>
        </div>
        <div>
          <span className="badge bg-primary px-3 py-2 fs-6">
            Station-01 &bull; Active Work Order
          </span>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {/* Left Column: Fixture Controls & Scan Input */}
        <div className="col-lg-6">
          <JigClampControl
            engaged={clampEngaged}
            onToggle={setClampEngaged}
            disabled={isFlashing}
          />
          <ProgrammerStatusLed
            connected={programmerConnected}
            status={programmerStatus}
          />

          {/* Barcode Scanner Input */}
          <div className="card shadow-sm border-0 bg-white mb-3">
            <div className="card-header bg-white border-bottom py-2">
              <span className="fw-bold text-dark">
                <i className="ti ti-barcode text-primary me-1"></i> Scan PCB Barcode (Auto-Flash)
              </span>
            </div>
            <div className="card-body p-3">
              <div className="input-group mb-2">
                <span className="input-group-text bg-light"><i className="ti ti-scan"></i></span>
                <input
                  type="text"
                  className="form-control font-monospace fw-bold text-primary"
                  placeholder="Scan PCB QR/Barcode (e.g. PCB-ZM-9042)..."
                  value={pcbSerial}
                  onChange={(e) => setPcbSerial(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isFlashing}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-bold"
                  onClick={startFlashing}
                  disabled={isFlashing || !pcbSerial.trim()}
                >
                  <i className="ti ti-bolt me-1"></i>
                  {isFlashing ? 'Flashing...' : 'Flash MCU'}
                </button>
              </div>

              {isFlashing && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span>Flashing Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <HexFileUploader firmwareVersion={firmwareVersion} checksum={checksum} />
          <ChipUidDisplay chipUid={chipUid} />
        </div>

        {/* Right Column: Console Log */}
        <div className="col-lg-6">
          <BootLogConsole logs={logs} />
        </div>
      </div>

      {/* Flashed Records Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="ti ti-history me-1 text-primary"></i> Stage 01 Flashing History
            </h6>
            <small className="text-secondary">Recent PCBs flashed and verified in current shift</small>
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
                <th scope="col">PCB Serial Number</th>
                <th scope="col">MCU 96-bit Chip UID</th>
                <th scope="col">Firmware Version</th>
                <th scope="col">SHA Checksum</th>
                <th scope="col">Status</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="text-secondary">{idx + 1}</td>
                  <td className="fw-bold font-monospace text-primary">{r.pcb_serial || '-'}</td>
                  <td className="font-monospace small text-muted">{r.chip_uid || '-'}</td>
                  <td><span className="badge bg-light text-dark border">{r.fw_version || 'v3.14.2'}</span></td>
                  <td><span className="badge bg-light text-secondary border font-monospace">{r.checksum || '0x8FA4'}</span></td>
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
