import React from 'react';

export default function FirmwareVerifyCard({
  relayState = 'CONNECTED',
  rtcDrift = 0.04,
  tamperCheck = { topCover: 'PASS', terminalCover: 'PASS', magneticSensor: 'PASS' },
  lcdCheck = 'PASS',
  onToggleRelay,
  isTesting = false
}) {
  const isRtcPass = Math.abs(rtcDrift) <= 0.12;

  return (
    <div className="card shadow-sm border-0 mb-3 bg-white">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="ti ti-checklist fs-4 text-primary me-2"></i>
          <h6 className="mb-0 fw-bold text-dark">Functional Validation Checks &amp; Hardware Circuit Tests</h6>
        </div>
        <span className="badge bg-primary-subtle text-primary border border-primary px-2.5 py-1">
          4-Point Compliance
        </span>
      </div>

      <div className="card-body p-3">
        <div className="row g-3">
          {/* Latching Relay Disconnect Circuit */}
          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light-subtle h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">
                  <i className="ti ti-switch-horizontal text-primary me-1"></i> Latching Relay Disconnector
                </span>
                <span className={`badge font-mono ${relayState === 'CONNECTED' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                  {relayState}
                </span>
              </div>
              <p className="text-secondary text-xs mb-3">
                Validates 60A bistable latching relay coil drive, load connect/disconnect contacts, and UC3 DLMS command execution.
              </p>
              <button
                type="button"
                className={`btn btn-sm ${relayState === 'CONNECTED' ? 'btn-outline-danger' : 'btn-outline-success'} fw-semibold`}
                onClick={onToggleRelay}
                disabled={isTesting}
              >
                <i className={`ti ${relayState === 'CONNECTED' ? 'ti-power' : 'ti-plug'} me-1`}></i>
                {relayState === 'CONNECTED' ? 'Execute Disconnect (Open)' : 'Execute Connect (Close)'}
              </button>
            </div>
          </div>

          {/* Real-Time Clock Accuracy */}
          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light-subtle h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">
                  <i className="ti ti-clock text-primary me-1"></i> Real-Time Clock (RTC) Drift
                </span>
                <span className={`badge font-mono ${isRtcPass ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'}`}>
                  {isRtcPass ? 'PASS (&le;0.12 ppm)' : 'DRIFT FAIL'}
                </span>
              </div>
              <div className="font-mono fs-4 fw-bold text-dark mb-1">
                {rtcDrift > 0 ? `+${rtcDrift}` : rtcDrift} <span className="fs-6 text-muted">ppm</span>
              </div>
              <p className="text-secondary text-xs mb-0">
                Temperature-compensated crystal oscillator (TCXO) calibration and backup supercapacitor test.
              </p>
            </div>
          </div>

          {/* Anti-Tamper Security Sensors */}
          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light-subtle h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">
                  <i className="ti ti-shield-lock text-primary me-1"></i> Anti-Tamper Sensor Matrix
                </span>
                <span className="badge bg-success-subtle text-success border border-success font-mono">
                  ALL SECURE
                </span>
              </div>
              <div className="vstack gap-2 text-xs font-mono">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Top Meter Cover Switch:</span>
                  <span className="badge bg-success text-white px-2 py-0.5">{tamperCheck.topCover || 'SECURE'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Terminal Cover Switch:</span>
                  <span className="badge bg-success text-white px-2 py-0.5">{tamperCheck.terminalCover || 'SECURE'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Hall Magnetic Immunity:</span>
                  <span className="badge bg-success text-white px-2 py-0.5">{tamperCheck.magneticSensor || '0.5T IMMUNE'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LCD Display Segment & Backlight */}
          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light-subtle h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">
                  <i className="ti ti-device-tv text-primary me-1"></i> LCD Segments &amp; Backlight
                </span>
                <span className="badge bg-success-subtle text-success border border-success font-mono">
                  {lcdCheck}
                </span>
              </div>
              <p className="text-secondary text-xs mb-2">
                Optical camera verification of all 8-digit 7-segment patterns, annunciator symbols (kW, kvar, tamper, battery), and white LED backlight.
              </p>
              <div className="badge bg-light text-dark border p-2 w-100 text-start font-mono">
                <i className="ti ti-check text-success me-1"></i> 888888.88 kWh All Segments Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
