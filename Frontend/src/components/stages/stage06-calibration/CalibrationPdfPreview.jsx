import React from 'react';
import { Modal } from '../../common/CommonComponents';

export default function CalibrationPdfPreview({ isOpen, onClose, batch = 'CAL-2026-B1', meters = [] }) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calibration Test Certificate & Compliance Preview"
      size="lg"
    >
      <div className="p-3 bg-white font-mono text-dark">
        <div className="border border-dark p-4 rounded">
          <div className="text-center pb-3 border-bottom border-dark mb-3">
            <h4 className="fw-bold text-uppercase mb-1">Zenmeter Solutions Pvt Ltd</h4>
            <div className="small text-secondary">National Metrology Calibration Certificate - Class 1.0 (IS 16444 / IEC 62053-21)</div>
            <div className="text-xs text-muted mt-1">Batch: {batch} &bull; Timestamp: {new Date().toLocaleString()}</div>
          </div>

          <div className="row g-2 text-xs mb-3">
            <div className="col-6"><strong>Reference Standard:</strong> ZERA MT3000 AC Source</div>
            <div className="col-6"><strong>Calibration Voltage:</strong> 230.00 V AC (UPF 1.0)</div>
            <div className="col-6"><strong>Calibration Current:</strong> 5.000 A AC @ 50.00 Hz</div>
            <div className="col-6"><strong>Max Permissible Error (MPE):</strong> &plusmn;0.20%</div>
          </div>

          <table className="table table-sm table-bordered text-xs mb-3">
            <thead className="table-light">
              <tr>
                <th>Pos</th>
                <th>Meter Serial</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Error %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m, idx) => {
                const err = Number(m.error_pct ?? m.errorPct ?? 0);
                const isPass = Math.abs(err) <= 0.20;
                return (
                  <tr key={idx}>
                    <td>#{m.pos || idx + 1}</td>
                    <td className="fw-bold">{m.serial_no || m.meterNo || `ZM-MTR-${6001 + idx}`}</td>
                    <td>{m.voltage || 230.0}</td>
                    <td>{m.current || 5.0}</td>
                    <td className={isPass ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                      {err > 0 ? `+${err.toFixed(2)}%` : `${err.toFixed(2)}%`}
                    </td>
                    <td>
                      <span className={`badge ${isPass ? 'bg-success' : 'bg-danger'}`}>
                        {isPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-end pt-3 border-top border-dark text-xs">
            <div>
              <p className="mb-0 text-muted">Test Method: High-Speed Opto-Electronic Pulse Counter</p>
              <p className="mb-0 text-muted">Constant: 1600 imp / kWh</p>
            </div>
            <div className="text-center">
              <div className="text-primary fw-bold text-uppercase border-bottom border-primary pb-1 mb-1" style={{ minWidth: '160px' }}>
                APPROVED &amp; SEALED
              </div>
              <small className="text-muted">Metrology Officer Signature</small>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3 font-sans">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Preview
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <i className="ti ti-printer me-1"></i> Print Certificate
          </button>
        </div>
      </div>
    </Modal>
  );
}
