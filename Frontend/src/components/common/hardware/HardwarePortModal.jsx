import React from 'react';
import Modal from '@/components/common/Modal/Modal';

const BAUD_OPTIONS = ['1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'];
const DATA_BITS_OPTIONS = ['8', '7'];
const PARITY_OPTIONS = ['None', 'Even', 'Odd', 'Mark', 'Space'];
const STOP_BITS_OPTIONS = ['1', '2'];
const PARITY_ERROR_OPTIONS = ["63 ('?')", "0 (NULL)", "None"];

/**
 * HardwarePortModal
 * Renders the exact COM Port Settings modal matching Image 2
 */
export default function HardwarePortModal({
  isOpen,
  onClose,
  title = 'Optical Port',
  connected = false,
  checking = false,
  portOptions = [],
  selectedPort = '',
  onSelectPort,
  onPairNewPort,
  onConnect,
  onDisconnect,
  config = {
    baudRate: '9600',
    dataBits: '8',
    parity: 'None',
    stopBits: '1',
    parityErrorChar: "63 ('?')"
  },
  onChangeConfig
}) {
  React.useEffect(() => {
    if (portOptions.length > 0) {
      const exists = portOptions.some(o => o.value === selectedPort);
      if (!exists && onSelectPort) {
        const firstAvailable = portOptions.find(o => !o.isTaken) || portOptions[0];
        if (firstAvailable) {
          onSelectPort(firstAvailable.value);
        }
      }
    } else if (selectedPort && onSelectPort) {
      onSelectPort('');
    }
  }, [portOptions, selectedPort, onSelectPort]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__pair_new__') {
      if (onPairNewPort) onPairNewPort();
      return;
    }
    if (onSelectPort) onSelectPort(val);
  };

  const handleConfigChange = (key, value) => {
    if (onChangeConfig) {
      onChangeConfig({ ...config, [key]: value });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="500px"
      title={
        <div className="d-flex align-items-center gap-2">
          <i className="ti ti-adjustments text-danger fs-5"></i>
          <span className="text-uppercase fw-bold text-dark" style={{ fontSize: '13px', letterSpacing: '0.5px' }}>
            {title} - COM Port Settings
          </span>
        </div>
      }
    >
      <div className="p-1">
        {/* Send/Receive on Comm. Channel (Image 2) */}
        <div className="mb-2 pb-2.5">
          <label className="form-label fw-semibold text-dark d-block mb-1.5" style={{ fontSize: '11.5px' }}>
            Send/Receive on Comm. Channel
          </label>
          <div className="d-flex flex-row align-items-center" style={{ gap: '8px' }}>
            <div className="input-group input-group-sm flex-grow-1">
              <span className="input-group-text bg-white border-secondary-subtle text-muted px-2.5">
                <i className="ti ti-plug" style={{ fontSize: '12px' }}></i>
              </span>
              <select
                className="form-select form-select-sm fw-medium bg-white border-secondary-subtle text-truncate"
                style={{ height: '34px', fontSize: '12px' }}
                value={selectedPort}
                onChange={handleSelectChange}
                disabled={checking || connected}
              >
                <option value="" disabled>Select COM Port from Device Manager...</option>
                {portOptions.length > 0 ? (
                  portOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.isTaken}>
                      {opt.label}{opt.takenMsg || ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No COM Port Detected on this System</option>
                )}
                <option value="__pair_new__">
                  + Pair / Connect COM Port for this System...
                </option>
              </select>
            </div>

            {!connected ? (
              <button
                type="button"
                className="btn btn-sm btn-success px-3 fw-semibold text-white shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                onClick={() => {
                  if (!selectedPort && portOptions.length === 0) {
                    if (onPairNewPort) onPairNewPort();
                  } else if (onConnect) {
                    onConnect();
                  }
                }}
                disabled={checking}
                title={`Connect ${title}`}
              >
                <i className={`ti ${checking ? 'ti-loader spin' : 'ti-plug'}`} style={{ fontSize: '13px' }}></i>
                <span>{checking ? 'Connecting...' : (!selectedPort && portOptions.length === 0 ? 'Pair & Connect' : 'Connect Port')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 fw-semibold shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                onClick={onDisconnect}
                disabled={checking}
                title={`Disconnect ${title}`}
              >
                <i className="ti ti-power" style={{ fontSize: '13px' }}></i>
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* COM Port Settings Section (Image 2) */}
        <div className="fw-semibold text-dark mb-1.5" style={{ fontSize: '11.5px' }}>
          COM Port Settings
        </div>
        <div className="row g-2">
          {/* Baud Rate */}
          <div className="col-12 col-sm-6">
            <div className="mb-2">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
                Baud Rate
              </label>
              <select
                className="form-select form-select-sm bg-white border-secondary-subtle"
                style={{ fontSize: '11.5px', height: '30px' }}
                value={config.baudRate || '9600'}
                onChange={(e) => handleConfigChange('baudRate', e.target.value)}
                disabled={connected}
              >
                {BAUD_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Parity */}
            <div className="mb-2">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
                Parity
              </label>
              <select
                className="form-select form-select-sm bg-white border-secondary-subtle"
                style={{ fontSize: '11.5px', height: '30px' }}
                value={config.parity || 'None'}
                onChange={(e) => handleConfigChange('parity', e.target.value)}
                disabled={connected}
              >
                {PARITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Parity Error Char */}
            <div className="mb-2">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
                Parity Error Char.
              </label>
              <select
                className="form-select form-select-sm bg-white border-secondary-subtle"
                style={{ fontSize: '11.5px', height: '30px' }}
                value={config.parityErrorChar || "63 ('?')"}
                onChange={(e) => handleConfigChange('parityErrorChar', e.target.value)}
                disabled={connected}
              >
                {PARITY_ERROR_OPTIONS.map((pec) => (
                  <option key={pec} value={pec}>{pec}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Data Bits, Stop Bits */}
          <div className="col-12 col-sm-6">
            <div className="mb-2">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
                Data Bits
              </label>
              <select
                className="form-select form-select-sm bg-white border-secondary-subtle"
                style={{ fontSize: '11.5px', height: '30px' }}
                value={config.dataBits || '8'}
                onChange={(e) => handleConfigChange('dataBits', e.target.value)}
                disabled={connected}
              >
                {DATA_BITS_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
                Stop Bits
              </label>
              <select
                className="form-select form-select-sm bg-white border-secondary-subtle"
                style={{ fontSize: '11.5px', height: '30px' }}
                value={config.stopBits || '1'}
                onChange={(e) => handleConfigChange('stopBits', e.target.value)}
                disabled={connected}
              >
                {STOP_BITS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
