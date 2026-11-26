import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../../app/store';
import { stageManagementService } from '../../../services/apiServices';
import { stage08Service } from '../../../services/stages/stage08.service';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../../utils/swal';
import Modal from '../../../components/common/Modal/Modal';
import webSerialService from '../../../services/common/webSerialService';
import { STAGE_08_FIELDS, METER_READER_FIELDS } from './stage08.constants';

const isDummyPortName = (name) => {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase();
  return (
    n === '' ||
    n === 'usb port' ||
    n === 'optical port' ||
    n === 'laser port' ||
    n === 'com port' ||
    n === 'serial port' ||
    n === 'none' ||
    /^usb\s*port(\s*\(\d+\))?$/i.test(n) ||
    /^laser\s*port(\s*\(\d+\))?$/i.test(n) ||
    /^optical\s*port(\s*\(\d+\))?$/i.test(n)
  );
};

const extractPortKey = (val) => {
  if (!val) return '';
  const match = String(val).match(/COM\d+/i);
  return match ? match[0].toUpperCase() : String(val).trim().toUpperCase();
};

const BAUD_RATE_OPTIONS = [
  '110', '300', '600', '1200', '2400', '4800', '9600', '14400', '19200',
  '28800', '38400', '56000', '57600', '115200', '230400', 'Custom Rate', 'None'
];

const DATA_BITS_OPTIONS = ['5', '6', '7', '8', 'Custom'];
const PARITY_OPTIONS = ['None', 'Even', 'Odd', 'Mark', 'Space', 'Custom'];
const STOP_BITS_OPTIONS = ['1', '1.5', '2', 'Custom'];
const PARITY_ERROR_CHAR_OPTIONS = [
  '(ignore)',
  "35 ('#')",
  "42 ('*')",
  "63 ('?')",
  "248 ('ø')",
  'Custom'
];

const DEFAULT_SERIAL_CONFIG = {
  baudRate: '9600',
  customBaudRate: '',
  dataBits: '8',
  customDataBits: '',
  parity: 'None',
  customParity: '',
  stopBits: '1',
  customStopBits: '',
  parityErrorChar: '(ignore)',
  customParityErrorChar: '',
  comPortLabel: ''
};

const getEffectiveSerialConfig = (cfg) => {
  const baud = cfg.baudRate === 'Custom Rate' ? Number(cfg.customBaudRate) || 9600 : Number(cfg.baudRate) || 9600;
  const data = cfg.dataBits === 'Custom' ? Number(cfg.customDataBits) || 8 : Number(cfg.dataBits) || 8;
  const parityVal = (cfg.parity === 'Custom' ? cfg.customParity : cfg.parity || 'none').toLowerCase();
  const stop = cfg.stopBits === 'Custom' ? Number(cfg.customStopBits) || 1 : Number(cfg.stopBits) || 1;
  const errChar = cfg.parityErrorChar === 'Custom' ? cfg.customParityErrorChar : cfg.parityErrorChar || '(ignore)';
  return {
    baudRate: baud,
    dataBits: data,
    parity: parityVal,
    stopBits: stop,
    parityErrorChar: errChar
  };
};

const formatSerialSummary = (cfg) => {
  const eff = getEffectiveSerialConfig(cfg);
  const pChar = (eff.parity || 'n').charAt(0).toUpperCase();
  return `${eff.baudRate}-${eff.dataBits}-${pChar}-${eff.stopBits}`;
};

function ComPortSettingsPanel({ title, config, onChange, onClose, commChannelContent, showHeader = false }) {
  return (
    <div className="p-1">
      {showHeader && (
        <div className="d-flex align-items-center justify-content-between mb-2.5 pb-1.5 border-bottom border-secondary-subtle">
          <span className="fw-semibold text-secondary small text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            <i className="ti ti-adjustments me-1 text-danger"></i> {title || 'COM Port Settings'}
          </span>
          {onClose && (
            <button
              type="button"
              className="btn btn-xs btn-link text-muted p-0 text-decoration-none"
              onClick={onClose}
              title="Close Settings"
              style={{ fontSize: '14px', lineHeight: 1 }}
            >
              <i className="ti ti-x"></i>
            </button>
          )}
        </div>
      )}

      {/* 1. Send/Receive on Comm. Channel (COM Port Selection & Connect/Disconnect Button) */}
      {commChannelContent && (
        <div className="mb-1 pb-2.5">
          <label className="form-label fw-semibold text-dark d-block" style={{ fontSize: '11.5px' }}>
            Send/Receive on Comm. Channel
          </label>
          {commChannelContent}
        </div>
      )}

      {/* 2. COM Port Settings */}
      <div className="fw-semibold text-dark" style={{ fontSize: '11.5px' }}>
        COM Port Settings
      </div>
      <div className="row g-2">
        {/* Left Column: Baud Rate, Parity, Parity Error Char. */}
        <div className="col-12 col-sm-6">
          <div className="mb-2">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
              Baud Rate
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '11.5px', height: '30px' }}
              value={config.baudRate}
              onChange={(e) => onChange('baudRate', e.target.value)}
            >
              {BAUD_RATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {config.baudRate === 'Custom Rate' && (
              <input
                type="number"
                className="form-control form-control-sm mt-1 bg-white border-secondary-subtle"
                style={{ fontSize: '11px', height: '28px' }}
                placeholder="Enter custom rate (e.g. 128000)"
                value={config.customBaudRate || ''}
                onChange={(e) => onChange('customBaudRate', e.target.value)}
              />
            )}
          </div>

          <div className="mb-2">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
              Parity
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '11.5px', height: '30px' }}
              value={config.parity}
              onChange={(e) => onChange('parity', e.target.value)}
            >
              {PARITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {config.parity === 'Custom' && (
              <input
                type="text"
                className="form-control form-control-sm mt-1 bg-white border-secondary-subtle"
                style={{ fontSize: '11px', height: '28px' }}
                placeholder="Enter custom parity"
                value={config.customParity || ''}
                onChange={(e) => onChange('customParity', e.target.value)}
              />
            )}
          </div>

          <div className="mb-1">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
              Parity Error Char.
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '11.5px', height: '30px' }}
              value={config.parityErrorChar}
              onChange={(e) => onChange('parityErrorChar', e.target.value)}
            >
              {PARITY_ERROR_CHAR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {config.parityErrorChar === 'Custom' && (
              <input
                type="text"
                className="form-control form-control-sm mt-1 bg-white border-secondary-subtle"
                style={{ fontSize: '11px', height: '28px' }}
                placeholder="Enter custom error char/code"
                value={config.customParityErrorChar || ''}
                onChange={(e) => onChange('customParityErrorChar', e.target.value)}
              />
            )}
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
              value={config.dataBits}
              onChange={(e) => onChange('dataBits', e.target.value)}
            >
              {DATA_BITS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {config.dataBits === 'Custom' && (
              <input
                type="number"
                className="form-control form-control-sm mt-1 bg-white border-secondary-subtle"
                style={{ fontSize: '11px', height: '28px' }}
                placeholder="Enter custom data bits"
                value={config.customDataBits || ''}
                onChange={(e) => onChange('customDataBits', e.target.value)}
              />
            )}
          </div>

          <div className="mb-2">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11px' }}>
              Stop Bits
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '11.5px', height: '30px' }}
              value={config.stopBits}
              onChange={(e) => onChange('stopBits', e.target.value)}
            >
              {STOP_BITS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {config.stopBits === 'Custom' && (
              <input
                type="text"
                className="form-control form-control-sm mt-1 bg-white border-secondary-subtle"
                style={{ fontSize: '11px', height: '28px' }}
                placeholder="Enter custom stop bits"
                value={config.customStopBits || ''}
                onChange={(e) => onChange('customStopBits', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Stage08Page() {
  const auth = useAuth?.() || {};
  const currentUser = auth.user;
  const currentOperatorId = currentUser?.employee_id || currentUser?.id || 'OPERATOR-08';

  const [activeWorkForm, setActiveWorkForm] = useState(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

  // Meter identifier & dynamic seal input values
  const [meterSerial, setMeterSerial] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [meterReaderData, setMeterReaderData] = useState({
    uid: '',
    status: '',
    meterSn: '',
    imei: '',
    nicSn: '',
    db: '',
    result: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verified records history
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const inputRefs = useRef({});
  const meterReaderRefs = useRef({});

  // ==========================================
  // Optical Port State & Serial Configuration
  // ==========================================
  const [opticalStatus, setOpticalStatus] = useState({
    connected: false,
    port: null,
    baudRate: 9600,
    ports: [],
    friendlyName: null,
    source: 'client_webserial',
    tunnelId: null,
    checking: false
  });
  const [availableOpticalPorts, setAvailableOpticalPorts] = useState([]);
  const [selectedOpticalPort, setSelectedOpticalPort] = useState(() => {
    try {
      const p = localStorage.getItem('zenmeter_optical_last_port') || '';
      return !isDummyPortName(p) ? p : '';
    } catch (_) {
      return '';
    }
  });
  const [pairedPorts, setPairedPorts] = useState([]);
  const [selectedPortId, setSelectedPortId] = useState('');
  const [showUsbSettings, setShowUsbSettings] = useState(false);
  const [isReadingOptical, setIsReadingOptical] = useState(false);
  const [isServerMachine, setIsServerMachine] = useState(true);

  const manualDisconnectedRef = useRef(false);
  const opticalStatusRef = useRef(opticalStatus);
  opticalStatusRef.current = opticalStatus;
  const selectedOpticalPortRef = useRef(selectedOpticalPort);
  selectedOpticalPortRef.current = selectedOpticalPort;

  const [usbSerialConfig, setUsbSerialConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('zenmeter_optical_serial_config');
      if (saved) return { ...DEFAULT_SERIAL_CONFIG, ...JSON.parse(saved) };
    } catch (_) { }
    return DEFAULT_SERIAL_CONFIG;
  });

  const updateUsbConfig = (key, value) => {
    setUsbSerialConfig(prev => {
      const updated = { ...prev, [key]: value };
      try { localStorage.setItem('zenmeter_optical_serial_config', JSON.stringify(updated)); } catch (_) { }
      return updated;
    });
  };

  // Unified options for Optical Port combining Server detected ports and browser WebSerial ports
  const opticalPortOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    (availableOpticalPorts || [])
      .filter(p => !isDummyPortName(p.friendlyName || p.path))
      .forEach(p => {
        const pKey = extractPortKey(p.path);
        seen.add(pKey);
        seen.add(p.path.toUpperCase());
        list.push({
          id: `server_${p.path}`,
          value: p.path,
          type: 'server',
          label: p.friendlyName || (p.path ? `USB Serial Port (${p.path})` : p.path),
          isTaken: false,
          takenMsg: ''
        });
      });

    (pairedPorts || [])
      .filter(p => !isDummyPortName(p.friendlyName))
      .forEach((p, idx) => {
        const pKey = extractPortKey(p.friendlyName);
        if (list.length > 0 && (!pKey || seen.has(pKey) || p.friendlyName.toLowerCase() === 'usb serial port')) {
          return;
        }
        if (pKey) seen.add(pKey);
        const isTaken = Boolean(p.port && p.port.readable !== null && webSerialService?.port !== p.port);
        list.push({
          id: `paired_${idx}`,
          value: p.friendlyName,
          type: 'webserial',
          portObj: p.port,
          label: p.friendlyName,
          isTaken,
          takenMsg: isTaken ? ' (In use)' : ''
        });
      });

    return list;
  }, [availableOpticalPorts, pairedPorts]);

  // Keep selectedPortId in sync with available options
  useEffect(() => {
    if (opticalStatus.connected) return;
    if (opticalPortOptions.length > 0 && !selectedPortId) {
      const availableOpt = opticalPortOptions.find(o => !o.isTaken) || opticalPortOptions[0];
      setSelectedPortId(availableOpt.id);
      setSelectedOpticalPort(availableOpt.value);
    }
  }, [opticalPortOptions, selectedPortId, opticalStatus.connected]);

  // Check Optical Port connection status and scan available hardware ports
  const checkOpticalCable = async (isExplicitCheck = false) => {
    if (manualDisconnectedRef.current) {
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      return;
    }

    if (isExplicitCheck) {
      setOpticalStatus(prev => ({ ...prev, checking: true }));
    }
    try {
      const devId = webSerialService.deviceId;
      const res = await stage08Service.getOpticalStatus({
        deviceId: devId,
        tunnelId: opticalStatusRef.current?.tunnelId || ''
      });

      const isServer = res?.isServerMachine ?? isServerMachine;
      if (res?.isServerMachine !== undefined) {
        setIsServerMachine(res.isServerMachine);
      }

      if (isServer) {
        const detectedPorts = (res && Array.isArray(res.ports))
          ? res.ports.filter(p => !isDummyPortName(p.friendlyName || p.path))
          : [];
        setAvailableOpticalPorts(detectedPorts);
        setOpticalStatus(prev => {
          const stillConnected = Boolean(prev.connected && detectedPorts.some(p => p.path === prev.port));
          return {
            ...prev,
            connected: stillConnected,
            ports: detectedPorts,
            checking: false
          };
        });

        if (detectedPorts.length > 0 && (!selectedOpticalPort || isDummyPortName(selectedOpticalPort))) {
          let savedPort = null;
          try {
            savedPort = localStorage.getItem('zenmeter_optical_last_port');
          } catch (_) { }
          const matched = savedPort && !isDummyPortName(savedPort) && detectedPorts.find(p => p.path && p.path.toLowerCase() === savedPort.toLowerCase());
          const chosen = (matched || detectedPorts[0]).path;
          setSelectedOpticalPort(chosen);
          setSelectedPortId(`server_${chosen}`);
        }

        if (isExplicitCheck && detectedPorts.length === 0) {
          showErrorAlert('USB Port Not Detected', 'No COM port detected on Server PC. Please connect the USB Cable.');
        }
      } else {
        setAvailableOpticalPorts([]);
        const localPaired = await refreshPairedPorts();
        setOpticalStatus(prev => ({
          ...prev,
          checking: false,
          ports: localPaired
        }));

        if (localPaired.length > 0 && (!selectedPortId || selectedPortId.startsWith('server_'))) {
          setSelectedPortId('paired_0');
          setSelectedOpticalPort(localPaired[0].friendlyName);
        } else if (localPaired.length === 0 && (!selectedPortId || selectedPortId.startsWith('server_'))) {
          setSelectedPortId('__pair_new__');
        }
      }
    } catch (err) {
      console.warn('Error checking USB Port:', err);
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false, source: null, tunnelId: null }));
      if (isExplicitCheck) {
        showErrorAlert('USB Port Not Detected', 'Unable to detect USB Port: ' + (err.message || 'Check connection'));
      }
    }
  };

  const refreshPairedPorts = async (overrideLabel = null) => {
    if (webSerialService.hasNativeSerial()) {
      try {
        const label = overrideLabel !== null ? overrideLabel : (usbSerialConfig?.comPortLabel || '');
        const list = await webSerialService.getPairedPorts(label);
        const filtered = (list || []).filter(p => !isDummyPortName(p.friendlyName));
        setPairedPorts(filtered);
        return filtered;
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Connect to local server COM port
  const handleConnectServerPort = async (portPath, isSilent = false) => {
    manualDisconnectedRef.current = false;
    setOpticalStatus(prev => ({ ...prev, checking: true }));

    try {
      const eff = getEffectiveSerialConfig(usbSerialConfig);
      const res = await stage08Service.connectOpticalPort({
        port: portPath,
        baudRate: eff.baudRate,
        dataBits: eff.dataBits,
        parity: eff.parity,
        stopBits: eff.stopBits,
        parityErrorChar: eff.parityErrorChar
      });
      if (res && res.success && res.connected) {
        try {
          localStorage.setItem('zenmeter_optical_was_connected', 'true');
          localStorage.setItem('zenmeter_optical_last_port', res.port || portPath);
          localStorage.setItem('zenmeter_optical_source', 'server');
          localStorage.setItem('zenmeter_optical_manual_disconnect', 'false');
        } catch (_) { }

        const summary = formatSerialSummary(usbSerialConfig);
        setOpticalStatus({
          connected: true,
          port: res.port || portPath,
          baudRate: eff.baudRate,
          ports: availableOpticalPorts.length > 0 ? availableOpticalPorts : (res.ports || []),
          friendlyName: `${res.friendlyName || res.port || portPath} (${summary})`,
          source: 'server',
          tunnelId: null,
          checking: false
        });
        setSelectedOpticalPort(res.port || portPath);
        setSelectedPortId(`server_${res.port || portPath}`);
        setShowUsbSettings(false);
        return true;
      } else {
        setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
        const errMsg = res?.message || 'Optical Port Not Detected. Please check physical cable connection.';
        if (!isSilent) {
          showErrorAlert('Optical Port Not Detected', errMsg);
        }
        return false;
      }
    } catch (err) {
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      if (!isSilent) {
        showErrorAlert('Optical Port Connection Error', err.message || 'Error connecting to Optical Port.');
      }
      return false;
    }
  };

  // Connect Optical Port: WebSerial or local server COM port
  const handleConnectCable = async (targetPortInstance = null, forceNewChooser = false, isSilent = false) => {
    manualDisconnectedRef.current = false;
    setOpticalStatus(prev => ({ ...prev, checking: true }));

    if (webSerialService.hasNativeSerial()) {
      try {
        const eff = getEffectiveSerialConfig(usbSerialConfig);
        let res = null;
        if (forceNewChooser) {
          res = await webSerialService.requestPortAndConnect(currentOperatorId, eff);
        } else if (targetPortInstance) {
          res = await webSerialService.connectPort(targetPortInstance, currentOperatorId, eff);
        } else {
          const list = await webSerialService.getPairedPorts();
          const freePort = list.find(p => !p.port.readable || webSerialService.port === p.port);
          if (freePort) {
            res = await webSerialService.connectPort(freePort.port, currentOperatorId, eff);
          } else {
            if (isSilent) {
              setOpticalStatus(prev => ({ ...prev, checking: false }));
              return false;
            }
            res = await webSerialService.requestPortAndConnect(currentOperatorId, eff);
          }
        }

        if (res && res.success) {
          try {
            localStorage.setItem('zenmeter_optical_was_connected', 'true');
            localStorage.setItem('zenmeter_optical_last_port', res.portName);
            localStorage.setItem('zenmeter_optical_source', 'client_webserial');
            localStorage.setItem('zenmeter_optical_manual_disconnect', 'false');
          } catch (_) { }

          const summary = formatSerialSummary(usbSerialConfig);
          const refreshed = await refreshPairedPorts();
          const newIdx = (refreshed || []).findIndex(p => p.port === webSerialService.port);
          setSelectedPortId(newIdx >= 0 ? `paired_${newIdx}` : 'paired_0');
          setSelectedOpticalPort(res.portName);

          setOpticalStatus({
            connected: true,
            port: res.portName,
            friendlyName: `${res.portName} (${summary})`,
            baudRate: eff.baudRate,
            ports: availableOpticalPorts.length > 0 ? availableOpticalPorts : [{ path: res.tunnelId, friendlyName: `${res.portName}` }],
            source: 'client_webserial',
            tunnelId: res.tunnelId,
            deviceId: webSerialService.deviceId,
            checking: false
          });
          setShowUsbSettings(false);
          return true;
        }
      } catch (err) {
        setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
        const isUserCancel = err.message && (err.message.includes('No serial port selected') || err.message.includes('NotFoundError'));
        const errMsg = isUserCancel ? 'No port selected.' : (err.message || 'Optical Port Not Detected.');
        if (!isSilent && !isUserCancel) {
          showErrorAlert('Optical Port Not Detected', errMsg);
        }
        return false;
      }
    }

    const targetServerPort = selectedOpticalPort || (availableOpticalPorts && availableOpticalPorts.length > 0 ? availableOpticalPorts[0].path : null);
    if (!targetServerPort) {
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      if (!isSilent) {
        showErrorAlert('Optical Port Not Detected', 'No COM port detected. Please plug the USB Cable into this computer.');
      }
      return false;
    }

    return await handleConnectServerPort(targetServerPort, isSilent);
  };

  // Direct connect handler from Settings modal
  const handleDirectConnectOptical = async () => {
    if (opticalStatus.checking) return;
    if (selectedPortId && selectedPortId.startsWith('server_')) {
      const path = selectedPortId.replace('server_', '');
      await handleConnectServerPort(path);
    } else if (selectedPortId && selectedPortId.startsWith('paired_')) {
      const idx = parseInt(selectedPortId.replace('paired_', ''), 10);
      const target = pairedPorts[idx];
      if (target && target.port) {
        await handleConnectCable(target.port, false);
      } else {
        await handleConnectCable(null, true);
      }
    } else {
      await handleConnectCable(null, false);
    }
  };

  // Disconnection handler
  const handleHardwareDisconnection = async (reason = 'Optical Port disconnected.', isUserInitiated = false) => {
    manualDisconnectedRef.current = isUserInitiated;

    try {
      if (isUserInitiated) {
        localStorage.setItem('zenmeter_optical_was_connected', 'false');
        localStorage.setItem('zenmeter_optical_manual_disconnect', 'true');
      }
    } catch (_) { }

    setOpticalStatus(prev => ({
      ...prev,
      connected: false,
      checking: false,
      source: null,
      tunnelId: null
    }));

    try {
      await webSerialService.disconnect();
    } catch (_) { }

    try {
      await stage08Service.disconnectOpticalPort({ port: selectedOpticalPortRef.current || opticalStatusRef.current?.port });
    } catch (_) { }
  };

  const handleToggleOpticalConnection = async () => {
    if (opticalStatus.connected) {
      await handleHardwareDisconnection('Disconnected by operator.', true);
    } else {
      await handleConnectCable();
    }
  };

  // Read Meter via Optical Probe
  const handleReadMeterOptical = async () => {
    if (!opticalStatus.connected) {
      showErrorAlert('Optical Port Disconnected', 'Please connect Optical Port before reading meter.');
      setShowUsbSettings(true);
      return;
    }

    setIsReadingOptical(true);
    try {
      const targetPort = selectedOpticalPort || opticalStatus.port || null;
      const effectiveTunnelId = opticalStatus.source === 'client_webserial' ? (opticalStatus.tunnelId || webSerialService.tunnelId) : null;
      const effectiveDeviceId = webSerialService.deviceId;

      const res = await stage08Service.readMeter({
        port: targetPort,
        work_id: activeWorkForm?.form_id || null,
        stage_id: 8,
        operator_id: currentOperatorId,
        operator_name: currentUser?.name || currentUser?.user_name || null,
        user_role: currentUser?.role || null,
        tunnel_id: effectiveTunnelId,
        device_id: effectiveDeviceId
      });

      if (res && res.success && res.meterData) {
        const { meterData, savedRecord } = res;
        const validSerial = meterData.serialNo ? String(meterData.serialNo).trim() : '';
        const validImei = meterData.imeiNo ? String(meterData.imeiNo).trim() : '';
        const validNic = meterData.nicSrNo ? String(meterData.nicSrNo).trim() : '';
        const validUid = savedRecord?.uid || meterData.uid || meterData.recordId || `UID-${validSerial || Date.now()}`;

        setMeterReaderData({
          uid: validUid,
          status: 'PASS',
          meterSn: validSerial,
          imei: validImei,
          nicSn: validNic,
          db: savedRecord ? 'SAVED' : 'PASS',
          result: 'PASS'
        });

        if (validSerial) {
          setMeterSerial(validSerial);
        }

        // If NIC SN field is active on stage 8, automatically populate it
        if (validNic && activeFields.some(f => f.key === 'nicSerialNumber')) {
          setFieldValues(prev => ({
            ...prev,
            nicSerialNumber: validNic
          }));
        }

        showSuccessAlert(
          'Meter Read Successful',
          `Scanned Meter SN: ${validSerial || 'N/A'}${validNic ? ` | NIC: ${validNic}` : ''}`
        );
      } else {
        showErrorAlert('Read Failed', res?.message || 'Failed to read meter data via optical probe.');
      }
    } catch (err) {
      showErrorAlert('Optical Read Error', err.message || 'Error communicating with optical probe.');
    } finally {
      setIsReadingOptical(false);
    }
  };

  // Demo Read for testing/simulation without physical probe
  const handleDemoReadMeter = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const demoSerial = `ZM24${randomSuffix}`;
    const demoImei = `86492004${randomSuffix}`;
    const demoNic = `NIC-ZG-${demoSerial}`;
    const demoUid = `UID-${demoSerial}`;

    setMeterReaderData({
      uid: demoUid,
      status: 'PASS',
      meterSn: demoSerial,
      imei: demoImei,
      nicSn: demoNic,
      db: 'PASS',
      result: 'PASS'
    });

    setMeterSerial(demoSerial);

    if (activeFields.some(f => f.key === 'nicSerialNumber')) {
      setFieldValues(prev => ({
        ...prev,
        nicSerialNumber: demoNic
      }));
    }

    showSuccessAlert('Demo Meter Loaded', `Meter: ${demoSerial} | NIC: ${demoNic}`);
  };

  // Auto-check port on mount
  useEffect(() => {
    checkOpticalCable(false);
    refreshPairedPorts();
  }, []);

  // 1. Load active assigned work form for Stage 8
  const loadActiveWorkForm = async () => {
    try {
      const res = await stageManagementService.getForms({ stage_number: 8 });
      const forms = Array.isArray(res) ? res : (res?.forms || res?.data || []);

      if (forms && forms.length > 0) {
        const assigned = forms.find(f =>
          Boolean(f.assigned_operator_id) &&
          f.status !== 'DE-ACTIVE' &&
          f.status !== 'COMPLETED'
        ) || forms[0];

        setActiveWorkForm(assigned || null);
        if (assigned) {
          setCompletedCount(assigned.completed_quantity || 0);
        }
      } else {
        setActiveWorkForm(null);
      }
    } catch (err) {
      console.warn('[Stage08] Error loading work forms:', err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // 2. Load verified records for Stage 8
  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await stage08Service.getRecords({ limit: 50 });
      const list = Array.isArray(res) ? res : (res?.records || res?.data || []);
      setRecords(list);
    } catch (err) {
      console.warn('[Stage08] Error loading records:', err.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadActiveWorkForm();
    fetchRecords();
    const interval = setInterval(loadActiveWorkForm, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter active fields configured for this work order
  const activeFields = useMemo(() => {
    if (!activeWorkForm) return [];
    const statuses = activeWorkForm.print_config?.stage08FieldStatuses || {};
    return STAGE_08_FIELDS.filter(f => Boolean(statuses[f.key]));
  }, [activeWorkForm]);

  // Handle changing input for a specific field
  const handleFieldValueChange = (key, value) => {
    setFieldValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMeterReaderChange = (key, value) => {
    setMeterReaderData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMeterReaderKeyDown = (e, currentKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = METER_READER_FIELDS.findIndex(f => f.key === currentKey);
      if (currentIndex >= 0 && currentIndex < METER_READER_FIELDS.length - 1) {
        const nextKey = METER_READER_FIELDS[currentIndex + 1].key;
        if (meterReaderRefs.current[nextKey]) {
          meterReaderRefs.current[nextKey].focus();
        }
      } else {
        e.target?.blur();
      }
    }
  };

  // Move to next field on Enter or Tab key, stop scanning when the last input field is finished
  const handleKeyDown = (e, currentKey) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = activeFields.findIndex(f => f.key === currentKey);
      if (currentIndex >= 0 && currentIndex < activeFields.length - 1) {
        const nextKey = activeFields[currentIndex + 1].key;
        if (inputRefs.current[nextKey]) {
          inputRefs.current[nextKey].focus();
        }
      } else {
        e.preventDefault();
        e.target?.blur();
        if (inputRefs.current[currentKey]) {
          inputRefs.current[currentKey].blur();
        }
      }
    }
  };

  // Check if all active fields have values
  const isAllScanned = Boolean(
    activeFields.length > 0 &&
    activeFields.every(f => fieldValues[f.key] && String(fieldValues[f.key]).trim().length > 0)
  );

  // Focus first input field when fields become available
  useEffect(() => {
    if (activeFields.length > 0 && inputRefs.current[activeFields[0].key]) {
      inputRefs.current[activeFields[0].key].focus();
    }
  }, [activeFields.length]);

  // Clear all form inputs
  const handleClear = () => {
    setMeterSerial('');
    setFieldValues({});
    setMeterReaderData({
      uid: '',
      status: '',
      meterSn: '',
      imei: '',
      nicSn: '',
      db: '',
      result: ''
    });
    if (activeFields.length > 0 && inputRefs.current[activeFields[0].key]) {
      inputRefs.current[activeFields[0].key].focus();
    }
  };

  // Submit verified seals record
  const handleSubmit = async () => {
    if (!isAllScanned || isSubmitting) return;

    if (!activeWorkForm) {
      showErrorAlert('No Active Work Order', 'Please assign an active Work Order to Stage 8 before verifying seals.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fallbackMeterNo = meterReaderData.meterSn?.trim() ||
        fieldValues.nicSerialNumber?.trim() ||
        meterReaderData.nicSn?.trim() ||
        fieldValues.meterLeftSeal1?.trim() ||
        fieldValues[activeFields[0]?.key]?.trim() ||
        `MTR-${Date.now()}`;

      const finalMeterSerial = meterSerial.trim() || fallbackMeterNo;

      const payload = {
        meter_no: finalMeterSerial,
        meter_serial: finalMeterSerial,
        form_id: activeWorkForm.form_id || activeWorkForm.id,
        work_id: activeWorkForm.form_id,
        status: 'PASS',
        seals: {
          meter_serial: finalMeterSerial,
          meter_reader: meterReaderData,
          ...fieldValues
        }
      };

      const res = await stage08Service.submitSeal(payload);
      if (res && res.success) {
        showSuccessAlert(
          'Seal Verified & Saved',
          `Meter ${finalMeterSerial} paired with all ${activeFields.length} security seals successfully!`
        );

        if (typeof res.completed_quantity === 'number') {
          setCompletedCount(res.completed_quantity);
        } else {
          setCompletedCount(prev => prev + 1);
        }

        // Reset inputs for next meter
        setMeterSerial('');
        setFieldValues({});
        setMeterReaderData({
          uid: '',
          status: '',
          meterSn: '',
          imei: '',
          nicSn: '',
          db: '',
          result: ''
        });
        if (activeFields.length > 0 && inputRefs.current[activeFields[0].key]) {
          inputRefs.current[activeFields[0].key].focus();
        }

        fetchRecords();
      } else {
        showErrorAlert('Submission Failed', res?.message || 'Failed to submit seal verification.');
      }
    } catch (err) {
      showErrorAlert('Error', err.message || 'Error submitting seal verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid px-0 pb-4">
      {/* 1. Active Work Order Ribbon Banner with Optical Port (Image 1 Style - ONLY optical port) */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-body py-2.5 px-3.5">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            {/* Left: Active Work Info */}
            <div>
              {!activeWorkForm || !activeWorkForm.assigned_operator_id ? (
                <div className="text-secondary small fst-italic d-flex align-items-center gap-1.5 py-1">
                  <i className="ti ti-info-circle text-warning fs-5"></i>
                  <span>No Work ID currently assigned to Stage #8. Assign a Work ID in Stage Management to start production.</span>
                </div>
              ) : (
                <div className="small font-mono text-secondary d-flex align-items-center flex-wrap">
                  <span className="d-inline-flex align-items-center gap-1.5">
                    <i className="ti ti-id-badge text-primary fs-5"></i>
                    <strong className="text-dark me-1">ACTIVE WORK ID:</strong>
                    <span className="text-primary fw-bold">{activeWorkForm.form_id}</span>
                  </span>
                  <span className="text-muted mx-2" style={{ margin: '0 10px' }}>|</span>
                  <span>
                    <strong className="me-1">Batch:</strong>
                    <span className="text-dark fw-bold">{activeWorkForm.batch_no}</span>
                  </span>
                  {activeWorkForm.month_year && (
                    <>
                      <span className="text-muted mx-2" style={{ margin: '0 10px' }}>|</span>
                      <span>
                        <strong className="me-1">Date:</strong>
                        <span className="text-dark fw-bold">{activeWorkForm.month_year}</span>
                      </span>
                    </>
                  )}
                  <span className="text-muted mx-2" style={{ margin: '0 10px' }}>|</span>
                  <span>
                    <strong className="me-1">Target:</strong>
                    <span className="text-dark fw-bold">{activeWorkForm.target_quantity || 0}</span>
                  </span>
                  <span className="text-muted mx-2" style={{ margin: '0 10px' }}>|</span>
                  <span>
                    <strong className="me-1">Completed:</strong>
                    <span className="text-success fw-bold">{completedCount}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Right: Optical Port Widget Card (Image 1 Style - ONLY Optical Port) */}
            <div
              className="p-1.5 px-2.5 rounded-3 bg-white shadow-2xs d-flex align-items-center justify-content-between"
              style={{ gap: '12px', minWidth: '220px' }}
            >
              <div className="d-flex align-items-center" style={{ gap: '10px', minWidth: 0 }}>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
                  style={{ width: '36px', height: '36px' }}
                >
                  <i
                    className={`ti ${
                      opticalStatus.checking
                        ? 'ti-loader spin text-warning'
                        : opticalStatus.connected
                          ? 'ti-plug-connected text-success'
                          : 'ti-usb'
                    } fs-4`}
                  ></i>
                </div>
                <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
                  <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13px', lineHeight: 1.2 }}>
                    Optical Port
                  </div>
                  <div className="d-flex align-items-center small text-nowrap" style={{ gap: '5px', fontSize: '11px' }}>
                    <span
                      className={`rounded-circle d-inline-block flex-shrink-0 ${
                        opticalStatus.connected
                          ? 'bg-success'
                          : opticalStatus.checking
                            ? 'bg-warning'
                            : 'bg-danger'
                      }`}
                      style={{ width: '6px', height: '6px' }}
                    ></span>
                    <span
                      className={`fw-medium text-truncate ${
                        opticalStatus.connected
                          ? 'text-success'
                          : opticalStatus.checking
                            ? 'text-warning-emphasis'
                            : 'text-muted'
                      }`}
                      style={{ maxWidth: '110px' }}
                      title={
                        opticalStatus.connected
                          ? (opticalStatus.friendlyName || selectedOpticalPort || opticalStatus.port || 'Connected')
                          : opticalStatus.checking
                            ? 'Connecting...'
                            : 'Disconnected'
                      }
                    >
                      {opticalStatus.connected
                        ? (opticalStatus.friendlyName || selectedOpticalPort || opticalStatus.port || 'Connected')
                        : opticalStatus.checking
                          ? 'Connecting...'
                          : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-2.5 py-1 fw-semibold shadow-xs d-inline-flex align-items-center text-nowrap flex-shrink-0"
                style={{ height: '32px', fontSize: '12px', gap: '5px' }}
                onClick={() => {
                  setShowUsbSettings(true);
                  checkOpticalCable(false);
                  refreshPairedPorts();
                }}
                title="Configure Optical Port COM Settings"
              >
                <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Work Order Security Seal Input Fields */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-header bg-white py-3 px-3.5 border-bottom border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-tags text-primary fs-4"></i>
            <h6 className="mb-0 fw-bold text-dark">
              Active Security Seal Fields ({activeFields.length} Configured)
            </h6>
          </div>
          <span className="small text-muted font-mono">
            Work ID: {activeWorkForm?.form_id || 'N/A'}
          </span>
        </div>
        <div className="card-body p-3.5">
          {activeFields.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="ti ti-alert-triangle fs-2 text-warning d-block mb-2"></i>
              <p className="mb-1 fw-semibold text-dark">No Active Input Fields Configured</p>
              <small className="text-secondary">
                This work order currently has no security seal fields enabled. Configure active seal fields under Stage Management &gt; Edit Work Order.
              </small>
            </div>
          ) : (
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-5 g-3">
              {activeFields.map((field) => {
                const val = fieldValues[field.key] || '';

                return (
                  <div className="col" key={field.key}>
                    <div className="mb-2">
                      <span className="fw-semibold text-dark small d-flex align-items-center gap-1.5 mb-1">
                        <i className={`ti ${field.icon || 'ti-tag'} text-primary`}></i>
                        {field.label}
                      </span>
                      <input
                        type="text"
                        ref={(el) => (inputRefs.current[field.key] = el)}
                        className="form-control form-control-sm py-1 font-mono fw-medium"
                        value={val}
                        onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, field.key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meter Reader Section */}
          <div className="mt-4 pt-3 border-top border-secondary-subtle">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <div className="d-flex align-items-center gap-2">
                <i className="ti ti-device-analytics text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark">Meter Reader</h6>
                <span className="badge bg-secondary-subtle text-secondary small py-0.5 px-2">Read-Only</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className={`btn btn-sm fw-semibold d-inline-flex align-items-center gap-1.5 ${
                    opticalStatus.connected ? 'btn-primary text-white' : 'btn-outline-secondary'
                  }`}
                  onClick={handleReadMeterOptical}
                  disabled={isReadingOptical}
                  title={
                    opticalStatus.connected
                      ? `Read meter via Optical Probe (${opticalStatus.friendlyName || selectedOpticalPort || opticalStatus.port})`
                      : 'Connect Optical Port first to read meter'
                  }
                >
                  <i className={`ti ${isReadingOptical ? 'ti-loader spin' : 'ti-scan'}`}></i>
                  <span>{isReadingOptical ? 'Reading Meter...' : 'Read Meter (Optical)'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
                  onClick={handleDemoReadMeter}
                  disabled={isReadingOptical}
                  title="Demo / simulate reading meter data"
                >
                  <i className="ti ti-keyboard"></i>
                  <span>Demo Read</span>
                </button>
              </div>
            </div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-5 g-3">
              {METER_READER_FIELDS.map((field) => (
                <div className="col" key={field.key}>
                  <div className="mb-2">
                    <span className="fw-semibold text-secondary small d-flex align-items-center gap-1.5 mb-1">
                      <i className={`ti ${field.icon || 'ti-tag'} text-secondary`}></i>
                      {field.label}
                    </span>
                    <input
                      type="text"
                      disabled
                      readOnly
                      tabIndex={-1}
                      ref={(el) => (meterReaderRefs.current[field.key] = el)}
                      className="form-control form-control-sm py-1 font-mono fw-medium bg-light text-secondary border-secondary-subtle"
                      value={meterReaderData[field.key] || ''}
                      style={{ cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {activeFields.length > 0 && (
            <div className="mt-4 pt-3 border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small text-muted font-mono">
                {activeFields.filter(f => fieldValues[f.key] && fieldValues[f.key].trim().length > 0).length} of {activeFields.length} seals scanned
              </span>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-light border btn-sm fw-semibold"
                  onClick={handleClear}
                >
                  <i className="ti ti-trash me-1"></i> Reset Fields
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-4 fw-bold shadow-xs ${isAllScanned && !isSubmitting ? 'btn-success text-white' : 'btn-secondary text-white'}`}
                  onClick={handleSubmit}
                  disabled={!isAllScanned || isSubmitting}
                >
                  <i className={`ti ${isSubmitting ? 'ti-loader spin' : 'ti-circle-check'} me-1`}></i>
                  {isSubmitting ? 'Verifying & Saving...' : 'Verify & Submit Seals'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Popup: Optical Port COM Settings */}
      <Modal
        isOpen={showUsbSettings}
        onClose={() => setShowUsbSettings(false)}
        maxWidth="500px"
        title={
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-adjustments text-danger fs-5"></i>
            <span className="text-uppercase fw-bold text-dark" style={{ fontSize: '13px', letterSpacing: '0.5px' }}>
              Optical Port - COM Port Settings
            </span>
          </div>
        }
      >
        <ComPortSettingsPanel
          title="OPTICAL PORT - COM PORT SETTINGS"
          config={usbSerialConfig}
          onChange={updateUsbConfig}
          onClose={() => setShowUsbSettings(false)}
          showHeader={false}
          commChannelContent={
            <div className="d-flex flex-row align-items-center" style={{ gap: '8px' }}>
              <div className="input-group input-group-sm flex-grow-1">
                <span className="input-group-text bg-white border-secondary-subtle text-muted px-2.5">
                  <i className="ti ti-plug" style={{ fontSize: '12px' }}></i>
                </span>
                <select
                  className="form-select form-select-sm fw-medium bg-white border-secondary-subtle text-truncate"
                  style={{ height: '34px', fontSize: '12px' }}
                  value={selectedPortId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__pair_new__') {
                      setSelectedPortId('__pair_new__');
                      handleConnectCable(null, true);
                      return;
                    }
                    setSelectedPortId(val);
                    if (val && val.startsWith('paired_')) {
                      const idx = parseInt(val.replace('paired_', ''), 10);
                      if (pairedPorts[idx]) {
                        setSelectedOpticalPort(pairedPorts[idx].friendlyName);
                      }
                    } else if (val && val.startsWith('server_')) {
                      setSelectedOpticalPort(val.replace('server_', ''));
                    }
                  }}
                  disabled={opticalStatus.checking || opticalStatus.connected}
                >
                  <option value="" disabled>Select / Connect USB Port...</option>
                  {opticalPortOptions.length > 0 ? (
                    opticalPortOptions.map((opt) => (
                      <option key={opt.id} value={opt.id} disabled={opt.isTaken}>
                        {opt.label}{opt.takenMsg}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No COM Port Detected</option>
                  )}
                  <option value="__pair_new__">
                    Select / Pair COM Port from Device Manager...
                  </option>
                </select>
              </div>

              {!opticalStatus.connected ? (
                <button
                  type="button"
                  className="btn btn-sm btn-success px-3 fw-semibold text-white shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                  style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                  onClick={handleDirectConnectOptical}
                  disabled={opticalStatus.checking}
                  title="Connect Optical USB Port"
                >
                  <i className={`ti ${opticalStatus.checking ? 'ti-loader spin' : 'ti-plug'}`} style={{ fontSize: '13px' }}></i>
                  <span>{opticalStatus.checking ? 'Connecting...' : 'Connect Port'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger px-3 fw-semibold shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                  style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                  onClick={handleToggleOpticalConnection}
                  disabled={opticalStatus.checking}
                  title={`Disconnect (${opticalStatus.friendlyName || opticalStatus.port || 'USB Port'})`}
                >
                  <i className="ti ti-power" style={{ fontSize: '13px' }}></i>
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          }
        />
      </Modal>
    </div>
  );
}
