import React from 'react';

export default function OpticalSetupGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-help-circle me-2"></i> USB Optical Cable Setup Guide
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="alert alert-info border-0 mb-4 d-flex align-items-center">
              <i className="ti ti-info-circle fs-2 me-3"></i>
              <div>
                <strong>WebSerial API Notice:</strong> Optical probes require Google Chrome or Edge with USB permissions enabled. Ensure the probe has direct line of sight with the meter's infrared LEDs.
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="card h-100 border bg-light">
                  <div className="card-body">
                    <h6 className="fw-bold text-dark mb-2">
                      <span className="badge bg-primary me-2">1</span> Hardware Driver Installation
                    </h6>
                    <p className="small text-secondary mb-2">
                      Most USB optical heads use FTDI or CH340 chipset. Install drivers if Windows Device Manager shows an exclamation mark:
                    </p>
                    <ul className="small text-secondary ps-3 mb-0">
                      <li>FTDI VCP Drivers (2.12.36 or newer)</li>
                      <li>Silicon Labs CP210x Universal Drivers</li>
                      <li>WCH CH340 / CH341 Serial Driver</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card h-100 border bg-light">
                  <div className="card-body">
                    <h6 className="fw-bold text-dark mb-2">
                      <span className="badge bg-primary me-2">2</span> Browser Permissions
                    </h6>
                    <p className="small text-secondary mb-2">
                      When clicking <strong>Connect Probe</strong>, select the USB device from Chrome's device prompt:
                    </p>
                    <ul className="small text-secondary ps-3 mb-0">
                      <li>Click "Connect Probe"</li>
                      <li>Select "USB Serial Port (COM...)"</li>
                      <li>Click "Connect" to authorize</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="card border bg-light">
                  <div className="card-body">
                    <h6 className="fw-bold text-dark mb-2">
                      <span className="badge bg-primary me-2">3</span> Baud Rate Alignment
                    </h6>
                    <p className="small text-secondary mb-0">
                      Zenmeter DLMS optical protocol defaults to <strong>9600 Baud, 8 Data Bits, 1 Stop Bit, No Parity (8-N-1)</strong>. If communication fails, check if the meter is set to mode E (auto-negotiating from 300 to 9600 baud).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer bg-light border-top">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
