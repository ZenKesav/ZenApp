import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../../app/store';
import { stageManagementService, stage09Service } from '../../../services/apiServices';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../../utils/swal';
import Swal from 'sweetalert2';
import MeterBodyPreview from '../../../components/stages/stage09-meter-box-print/MeterBodyPrint/MeterBodyPreview';
import MeterInteractiveTextEditor from '../../../components/stages/stage09-meter-box-print/MeterBodyPrint/MeterInteractiveTextEditor';
import { UTILITY_LOGO_OPTIONS } from '../../../components/stages/stage09-meter-box-print/MeterBodyPrint/UtilityLogos';
import Modal from '../../../components/common/Modal/Modal';
import { Pagination } from '../../../components/CommonComponents';
import webSerialService from '../../../services/common/webSerialService';
import laserWebSerialService from '../../../services/common/laserWebSerialService';

// Default clean configurations without hardcoded mock data
const DEFAULT_PRINT_SPECS = {
  logoType: 'zenmeter',
  customLogoUrl: null,
  customLogoText: '',
  logoTagline: '',
  brandTitle: '',
  qrValue: '',
  imei: '',
  wanComm: '',
  meterTitle: '',
  voltageCurrent: '',
  accuracyClass: '',
  category: '',
  meterType: '',
  propertyOf: '',
  loaNo: '',
  pulseConstant: '',
  mfgDate: '',
  serialNo: '',
  manufacturer: '',
  bisText: '',
  lcdReading: ''
};

export const isDummyPortName = (name) => {
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

export const extractPortKey = (val) => {
  if (!val) return '';
  const match = String(val).match(/COM\d+/i);
  return match ? match[0].toUpperCase() : String(val).trim().toUpperCase();
};

export const BAUD_RATE_OPTIONS = [
  '110',
  '300',
  '600',
  '1200',
  '2400',
  '4800',
  '9600',
  '14400',
  '19200',
  '28800',
  '38400',
  '56000',
  '57600',
  '115200',
  '230400',
  'Custom Rate',
  'None'
];

export const DATA_BITS_OPTIONS = ['5', '6', '7', '8', 'Custom'];
export const PARITY_OPTIONS = ['None', 'Even', 'Odd', 'Mark', 'Space', 'Custom'];
export const STOP_BITS_OPTIONS = ['1', '1.5', '2', 'Custom'];
export const PARITY_ERROR_CHAR_OPTIONS = [
  '(ignore)',
  "35 ('#')",
  "42 ('*')",
  "63 ('?')",
  "248 ('ø')",
  'Custom'
];

export const DEFAULT_SERIAL_CONFIG = {
  baudRate: '9600',
  customBaudRate: '',
  dataBits: '8',
  customDataBits: '',
  parity: 'None',
  customParity: '',
  stopBits: '1',
  customStopBits: '',
  parityErrorChar: "63 ('?')",
  customParityErrorChar: '',
  comPortLabel: ''
};

export const getEffectiveSerialConfig = (cfg) => {
  if (!cfg) return { baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1, parityErrorChar: "63 ('?')", comPortLabel: '' };
  const baudRate = cfg.baudRate === 'Custom Rate'
    ? (Number(cfg.customBaudRate) || 9600)
    : (cfg.baudRate === 'None' ? 9600 : (Number(cfg.baudRate) || 9600));
  const dataBits = cfg.dataBits === 'Custom'
    ? (Number(cfg.customDataBits) || 8)
    : (Number(cfg.dataBits) || 8);
  const parity = cfg.parity === 'Custom'
    ? (cfg.customParity || 'None')
    : (cfg.parity || 'None');
  const stopBits = cfg.stopBits === 'Custom'
    ? (Number(cfg.customStopBits) || 1)
    : (Number(cfg.stopBits) || 1);
  const parityErrorChar = cfg.parityErrorChar === 'Custom'
    ? (cfg.customParityErrorChar || "63 ('?')")
    : (cfg.parityErrorChar || "63 ('?')");
  return {
    baudRate,
    dataBits,
    parity: String(parity).toLowerCase(),
    stopBits,
    parityErrorChar,
    comPortLabel: cfg.comPortLabel || ''
  };
};

export const formatSerialSummary = (cfg) => {
  const eff = getEffectiveSerialConfig(cfg);
  const pChar = eff.parity ? eff.parity.charAt(0).toUpperCase() : 'N';
  return `${eff.baudRate} ${eff.dataBits}${pChar}${eff.stopBits}`;
};

function ComPortSettingsPanel({ title, config, onChange, onClose, commChannelContent }) {
  return (
    <div className="mt-2.5 p-3 bg-light rounded-2 border border-secondary-subtle">
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

      {/* 1. Send/Receive on Comm. Channel (COM Port Selection & Connect/Disconnect Button) */}
      {commChannelContent && (
        <div className="mb-3 pb-2.5 border-bottom border-secondary-subtle">
          <label className="form-label fw-semibold text-dark mb-1.5 d-block" style={{ fontSize: '11.5px' }}>
            Send/Receive on Comm. Channel
          </label>
          {commChannelContent}
        </div>
      )}

      {/* 2. COM Port Settings */}
      <div className="fw-semibold text-dark mb-2" style={{ fontSize: '11.5px' }}>
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

export default function MeterBodyPrintConsole({
  stageId = 9,
  stageTitle = 'Meter Box Body Print',
  lineType = 'Main Meter Assembly Line',
  stationId = 'Station-07',
  user = null,
  canManageWorkId: propCanManage = undefined,
  initialFormId = null,
  initialWorkForm = null
}) {
  const auth = useAuth?.() || {};
  const currentUser = user || auth.user;
  const rawRole = (currentUser?.role || '').toUpperCase().replace(/\s+/g, '_');
  const isSupervisor = rawRole === 'SUPERVISOR' || rawRole.includes('SUPERVISOR');
  const isQC = rawRole === 'QC' || rawRole.includes('QC') || rawRole.includes('QUALITY');
  const isAdmin = rawRole === 'ADMIN' || rawRole.includes('ADMIN') || rawRole.includes('IT');
  const isOperator = rawRole === 'OPERATOR' || (!isAdmin && !isSupervisor && !isQC);
  const hideProductionMetrics = false; // Production metrics are visible identically for Operator, QC Tester, and Supervisor

  // On /stages/:stageId execution console, Operator, Supervisor, and QC all use the operational console.
  // Work ID configuration is only enabled when explicitly requested via propCanManage={true}.
  const canManageWorkId = Boolean(propCanManage);
  const currentOperatorId = currentUser?.employee_id || currentUser?.user_name || currentUser?.name || '';
  const currentUserName = currentUser?.name
    ? `${currentUser.name} (${currentUser.employee_id || rawRole})`
    : (currentUser?.user_name || '');

  const [workForms, setWorkForms] = useState([]);
  const [activeFormId, setActiveFormId] = useState('');
  const [currentConfig, setCurrentConfig] = useState(DEFAULT_PRINT_SPECS);
  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'identity' | 'specs' | 'compliance'
  const [viewMode, setViewMode] = useState('cad'); // 'cad' | 'actual' | 'laser_only' | 'blueprint'
  const [activeField, setActiveField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Laser printing state: when user clicks Laser Print, wait for Laser Machine inputs (F1, F2, F3)
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserQueryStatus, setLaserQueryStatus] = useState({ f1: false, f2: false, f3: false });
  const laserPollTimerRef = useRef(null);
  const [printProgress, setPrintProgress] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [printLogs, setPrintLogs] = useState([
    { id: 1, time: '10:14:02', msg: 'USB Port station calibrated. Ready for Work Orders.', status: 'INFO' },
    { id: 2, time: '10:15:30', msg: 'Laser source 20W Fiber Laser ready. Ready for Work Orders.', status: 'SUCCESS' }
  ]);

  // USB Port / Cable Connection & DLMS Reader State
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
  const [selectedOpticalPort, setSelectedOpticalPort] = useState('');
  const [pairedPorts, setPairedPorts] = useState([]);
  const [selectedPortId, setSelectedPortId] = useState('');
  const manualDisconnectedRef = useRef(false);
  const opticalStatusRef = useRef(opticalStatus);
  opticalStatusRef.current = opticalStatus;
  const selectedOpticalPortRef = useRef(selectedOpticalPort);
  selectedOpticalPortRef.current = selectedOpticalPort;
  const [isReadingOptical, setIsReadingOptical] = useState(false);
  const [readMeterStatusMsg, setReadMeterStatusMsg] = useState(null);
  const [lastReadMeterData, setLastReadMeterData] = useState(null);
  const [showInsecureHelpModal, setShowInsecureHelpModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Laser Port Serial COM Port State
  const [laserStatus, setLaserStatus] = useState({
    connected: false,
    port: null,
    friendlyName: null,
    source: 'client_webserial',
    baudRate: 9600,
    ports: [],
    checking: false
  });
  const laserStatusRef = useRef(laserStatus);
  laserStatusRef.current = laserStatus;
  const [selectedLaserPort, setSelectedLaserPort] = useState(() => {
    try {
      const p = localStorage.getItem('zenmeter_laser_last_port') || '';
      const clean = extractPortKey(p) || p;
      return !isDummyPortName(clean) ? clean : '';
    } catch (_) {
      return '';
    }
  });
  const [availableLaserPorts, setAvailableLaserPorts] = useState([]);
  const [selectedLaserPortId, setSelectedLaserPortId] = useState(() => {
    try {
      const p = localStorage.getItem('zenmeter_laser_last_port');
      const clean = extractPortKey(p) || p;
      if (clean && !isDummyPortName(clean)) {
        return `laser_server_${clean}`;
      }
    } catch (_) { }
    return '';
  });

  const [isServerMachine, setIsServerMachine] = useState(true);
  const [pairedLaserPorts, setPairedLaserPorts] = useState([]);

  // COM Port Settings (Baud Rate, Data Bits, Parity, Stop Bits, Parity Error Char)
  const [usbSerialConfig, setUsbSerialConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('zenmeter_optical_serial_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.comPortLabel;
        return { ...DEFAULT_SERIAL_CONFIG, ...parsed, comPortLabel: '' };
      }
    } catch (_) { }
    return { ...DEFAULT_SERIAL_CONFIG, comPortLabel: '' };
  });

  const [laserSerialConfig, setLaserSerialConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('zenmeter_laser_serial_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.comPortLabel;
        return { ...DEFAULT_SERIAL_CONFIG, ...parsed, comPortLabel: '' };
      }
    } catch (_) { }
    return { ...DEFAULT_SERIAL_CONFIG, comPortLabel: '' };
  });

  const [showUsbSettings, setShowUsbSettings] = useState(false);
  const [showLaserSettings, setShowLaserSettings] = useState(false);

  const updateUsbConfig = (key, value) => {
    setUsbSerialConfig(prev => {
      const updated = { ...prev, [key]: value };
      try { localStorage.setItem('zenmeter_optical_serial_config', JSON.stringify(updated)); } catch (_) { }
      return updated;
    });
  };

  const updateLaserConfig = (key, value) => {
    setLaserSerialConfig(prev => {
      const updated = { ...prev, [key]: value };
      try { localStorage.setItem('zenmeter_laser_serial_config', JSON.stringify(updated)); } catch (_) { }
      return updated;
    });
  };

  // Unified options for Optical Port combining Server detected ports and browser WebSerial ports
  const opticalPortOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    const laserKey = laserStatus.connected && laserStatus.port ? extractPortKey(laserStatus.port) : null;

    (availableOpticalPorts || [])
      .filter(p => !isDummyPortName(p.friendlyName || p.path))
      .forEach(p => {
        const pKey = extractPortKey(p.path);
        const isTaken = Boolean(laserKey && pKey === laserKey);
        seen.add(pKey);
        seen.add(p.path.toUpperCase());
        list.push({
          id: `server_${p.path}`,
          value: p.path,
          type: 'server',
          label: p.friendlyName || (p.path ? `USB Serial Port (${p.path})` : p.path),
          isTaken,
          takenMsg: isTaken ? ' (In use by Laser Port)' : ''
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
        const isTaken = Boolean(
          p.isUsedByLaser ||
          (laserWebSerialService?.port && laserWebSerialService.port === p.port && laserWebSerialService.connected) ||
          (p.port && p.port.readable !== null && webSerialService?.port !== p.port)
        );
        list.push({
          id: `paired_${idx}`,
          value: p.friendlyName,
          type: 'webserial',
          portObj: p.port,
          label: p.friendlyName,
          isTaken,
          takenMsg: isTaken ? ' (In use by Laser Port)' : ''
        });
      });

    return list;
  }, [availableOpticalPorts, pairedPorts, laserStatus.connected, laserStatus.port]);

  // Unified options for Laser Port combining Server detected ports and browser WebSerial ports
  const laserPortOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    const usbKey = opticalStatus.connected && opticalStatus.port ? extractPortKey(opticalStatus.port) : null;

    (availableLaserPorts || [])
      .filter(p => !isDummyPortName(p.friendlyName || p.path))
      .forEach(p => {
        const pKey = extractPortKey(p.path);
        const isTaken = Boolean(usbKey && pKey === usbKey);
        seen.add(pKey);
        seen.add(p.path.toUpperCase());
        list.push({
          id: `laser_server_${p.path}`,
          value: p.path,
          type: 'server',
          label: p.friendlyName || (p.path ? `USB Serial Port (${p.path})` : p.path),
          isTaken,
          takenMsg: isTaken ? ' (In use by Optical Port)' : ''
        });
      });

    (pairedLaserPorts || [])
      .filter(p => !isDummyPortName(p.friendlyName))
      .forEach((p, idx) => {
        const pKey = extractPortKey(p.friendlyName);
        if (list.length > 0 && (!pKey || seen.has(pKey) || p.friendlyName.toLowerCase() === 'usb serial port')) {
          return;
        }
        if (pKey) seen.add(pKey);
        const isTaken = Boolean(
          p.isUsedByOptical ||
          (webSerialService?.port && webSerialService.port === p.port && webSerialService.connected) ||
          (p.port && p.port.readable !== null && laserWebSerialService?.port !== p.port)
        );
        list.push({
          id: `laser_paired_${idx}`,
          value: p.friendlyName,
          type: 'webserial',
          portObj: p.port,
          label: p.friendlyName,
          isTaken,
          takenMsg: isTaken ? ' (In use by Optical Port)' : ''
        });
      });

    return list;
  }, [availableLaserPorts, pairedLaserPorts, opticalStatus.connected, opticalStatus.port]);

  // Keep Optical dropdown selection pointing to a valid detected port
  useEffect(() => {
    const valid = opticalPortOptions.filter(o => !o.isTaken);
    const currentMatches = valid.some(o => o.id === selectedPortId);
    if (!currentMatches && selectedPortId !== '__pair_new__') {
      if (valid.length > 0) {
        setSelectedPortId(valid[0].id);
        setSelectedOpticalPort(valid[0].value);
      } else {
        setSelectedPortId('');
        setSelectedOpticalPort('');
      }
    }
  }, [opticalPortOptions, selectedPortId]);

  // Keep Laser dropdown selection pointing to a valid detected port
  useEffect(() => {
    const valid = laserPortOptions.filter(o => !o.isTaken);
    const currentMatches = valid.some(o => o.id === selectedLaserPortId);
    if (!currentMatches && selectedLaserPortId !== '__laser_pair_new__') {
      if (valid.length > 0) {
        setSelectedLaserPortId(valid[0].id);
        setSelectedLaserPort(valid[0].value);
      } else {
        setSelectedLaserPortId('');
        setSelectedLaserPort('');
      }
    }
  }, [laserPortOptions, selectedLaserPortId]);

  // Direct connect handler for Optical Port
  const handleDirectConnectOptical = async () => {
    if (opticalStatus.checking) return;
    if (selectedPortId && selectedPortId.startsWith('server_')) {
      const path = selectedPortId.replace('server_', '');
      const targetKey = extractPortKey(path);
      if (laserStatus.connected && laserStatus.port && extractPortKey(laserStatus.port) === targetKey) {
        showErrorAlert(
          'Port Already in Use',
          `COM port ${targetKey} is already connected to Laser Port. Please select a different COM port for Optical Port.`
        );
        return;
      }
      await handleConnectServerPort(path);
    } else if (selectedPortId && selectedPortId.startsWith('paired_')) {
      const idx = parseInt(selectedPortId.replace('paired_', ''), 10);
      const target = pairedPorts[idx];
      if (target && target.port) {
        if (target.isUsedByLaser || (target.port.readable !== null && webSerialService.port !== target.port)) {
          handleConnectCable(null, true);
        } else {
          handleConnectCable(target.port, false);
        }
      } else {
        handleConnectCable(null, true);
      }
    } else if (opticalPortOptions.length > 0) {
      const firstFree = opticalPortOptions.find(o => !o.isTaken);
      if (firstFree) {
        if (firstFree.type === 'server') {
          await handleConnectServerPort(firstFree.value);
        } else if (firstFree.portObj) {
          await handleConnectCable(firstFree.portObj, false);
        }
      } else {
        handleConnectCable(null, true);
      }
    } else {
      handleConnectCable(null, true);
    }
  };

  // Direct connect handler for Laser Port
  const handleDirectConnectLaser = async () => {
    if (laserStatus.checking) return;
    if (selectedLaserPortId && selectedLaserPortId.startsWith('laser_server_')) {
      const path = selectedLaserPortId.replace('laser_server_', '');
      const targetKey = extractPortKey(path);
      if (opticalStatus.connected && opticalStatus.port && extractPortKey(opticalStatus.port) === targetKey) {
        showErrorAlert(
          'Port Already in Use',
          `COM port ${targetKey} is already connected to Optical Port. Please select a different COM port for Laser Port.`
        );
        return;
      }
      await handleConnectServerLaserPort(path);
    } else if (selectedLaserPortId && selectedLaserPortId.startsWith('laser_paired_')) {
      const idx = parseInt(selectedLaserPortId.replace('laser_paired_', ''), 10);
      const target = pairedLaserPorts[idx];
      if (target && target.port) {
        if (target.isUsedByOptical || (target.port.readable !== null && laserWebSerialService.port !== target.port)) {
          handleConnectLaser(null, true);
        } else {
          handleConnectLaser(target.port, false);
        }
      } else {
        handleConnectLaser(null, true);
      }
    } else if (laserPortOptions.length > 0) {
      const firstFree = laserPortOptions.find(o => !o.isTaken);
      if (firstFree) {
        if (firstFree.type === 'server') {
          await handleConnectServerLaserPort(firstFree.value);
        } else if (firstFree.portObj) {
          await handleConnectLaser(firstFree.portObj, false);
        }
      } else {
        handleConnectLaser(null, true);
      }
    } else {
      handleConnectLaser(null, true);
    }
  };

  const handleToggleLaserConnection = async () => {
    if (laserStatus.connected) {
      await handleDisconnectLaserPort();
    } else {
      await handleDirectConnectLaser();
    }
  };

  const isEmptyValue = (val) => {
    if (!val) return true;
    const str = String(val).trim();
    return str.length === 0 || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined';
  };

  // Missing fields in the currently active/loaded meter
  const missingMeterFields = (() => {
    const missing = [];
    const s = lastReadMeterData?.serialNo ?? currentConfig?.serialNo;
    const i = lastReadMeterData?.imeiNo ?? currentConfig?.imei;
    let n = lastReadMeterData?.nicSrNo ?? currentConfig?.nicsrno;
    if (n && n === `NIC-${s}`) n = '';

    if (isEmptyValue(s)) missing.push('Serial No');
    if (isEmptyValue(i)) missing.push('IMEI No');
    if (isEmptyValue(n)) missing.push('NIC Sr. No');
    return missing;
  })();

  const hasAllThreeNumbers = Boolean(
    lastReadMeterData &&
    !isEmptyValue(lastReadMeterData.serialNo) &&
    !isEmptyValue(lastReadMeterData.imeiNo) &&
    !isEmptyValue(lastReadMeterData.nicSrNo) &&
    lastReadMeterData.nicSrNo !== `NIC-${lastReadMeterData.serialNo}` &&
    missingMeterFields.length === 0
  );

  const isMeterAlreadyPrinted = Boolean(
    lastReadMeterData?.isAlreadyPrinted ||
    lastReadMeterData?.print === 'printed' ||
    lastReadMeterData?.print === 'PRINTED' ||
    lastReadMeterData?.printStatus === 'PRINTED'
  );

  // Meter reading workflow: Laser Print is allowed ONLY IF:
  // 1. A meter reading has been completed or demo meter is loaded
  // 2. Serial No, IMEI No, and NIC Sr. No are ALL 3 present (none missing!)
  // 3. For real meters: successfully persisted in PostgreSQL (savedToDb === true)
  // 4. Print status is NOT printed (print is null / unprinted)
  // 5. Optical cable is connected (or demo mode) and not currently reading
  const hasValidMeterData = Boolean(
    lastReadMeterData &&
    (lastReadMeterData.isDemo || (lastReadMeterData.savedToDb !== false && lastReadMeterData.recordId)) &&
    !lastReadMeterData.isIncomplete &&
    hasAllThreeNumbers &&
    !isMeterAlreadyPrinted &&
    !isReadingOptical
  );

  // Meter read is incomplete if real data was read but is missing required fields or not saved to DB
  const isIncompleteRead = Boolean(
    lastReadMeterData && !lastReadMeterData.isDemo && (
      lastReadMeterData.isIncomplete ||
      lastReadMeterData.savedToDb === false ||
      !lastReadMeterData.recordId ||
      !hasAllThreeNumbers
    )
  );

  // When all 3 data are read & saved to DB (hasValidMeterData === true), DISABLE Read Meter.
  // When read data is incomplete (isIncompleteRead === true), operator must click Reset to re-enable Read Meter.
  const isReadMeterDisabled = Boolean(
    !opticalStatus.connected ||
    isReadingOptical ||
    !activeFormId ||
    activeFormId === 'UNASSIGNED' ||
    hasValidMeterData ||
    isIncompleteRead
  );

  // Reset handler: removes old read meter data, resets config, hides Reset button, and re-enables Read Meter
  const handleResetIncompleteRead = () => {
    setLastReadMeterData(null);
    laserWebSerialService.setActiveMeter(null);
    setReadMeterStatusMsg(null);
    setCurrentConfig(prev => ({
      ...prev,
      recordId: null,
      serialNo: '',
      imei: '',
      deviceNo: '',
      nicsrno: ''
    }));
  };

  useEffect(() => {
    if (!readMeterStatusMsg) return undefined;
    const timer = setTimeout(() => {
      setReadMeterStatusMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [readMeterStatusMsg]);

  // Listen for Laser Session events & clean up polling on unmount
  useEffect(() => {
    const unsub = laserWebSerialService.onSession((sessionData) => {
      if (sessionData) {
        setIsLaserActive(Boolean(sessionData.isLaserActive));
        if (sessionData.sent) {
          setLaserQueryStatus(sessionData.sent);
        }
      }
    });
    return () => {
      unsub();
      if (laserPollTimerRef.current) {
        clearInterval(laserPollTimerRef.current);
      }
    };
  }, []);
  const [savedMeterRecords, setSavedMeterRecords] = useState([]);
  const [operatorCompletedCount, setOperatorCompletedCount] = useState(null);
  const [batchCompletedCount, setBatchCompletedCount] = useState(null);
  const [dbTargetQuantity, setDbTargetQuantity] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(5);

  // Sort records so the LAST (most recent) data is shown on TOP
  const sortedMeterRecords = React.useMemo(() => {
    if (!Array.isArray(savedMeterRecords)) return [];
    return [...savedMeterRecords].sort((a, b) => {
      // 1. By created_at timestamp descending (latest first)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      // 2. By ID descending (newest ID on top)
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idB !== idA) return idB - idA;
      return 0;
    });
  }, [savedMeterRecords]);

  const totalPages = Math.max(1, Math.ceil(sortedMeterRecords.length / recordsPageSize));
  const paginatedRecords = sortedMeterRecords.slice(
    (recordsPage - 1) * recordsPageSize,
    recordsPage * recordsPageSize
  );

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
      const res = await stage09Service.getOpticalStatus({
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
        // Remote laptop: hide server ports completely!
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

  const refreshPairedLaserPorts = async (overrideLabel = null) => {
    if (laserWebSerialService.hasNativeSerial()) {
      try {
        const label = overrideLabel !== null ? overrideLabel : (laserSerialConfig?.comPortLabel || '');
        const list = await laserWebSerialService.getPairedPorts(label);
        const filtered = (list || []).filter(p => !isDummyPortName(p.friendlyName));
        setPairedLaserPorts(filtered);
        return filtered;
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Connect to local server COM port after testing physical communication
  const handleConnectServerPort = async (portPath, isSilent = false) => {
    manualDisconnectedRef.current = false;
    const targetKey = extractPortKey(portPath);

    // Prevent connecting to the same COM port that Laser Port is currently using
    if (laserStatus.connected && laserStatus.port && extractPortKey(laserStatus.port) === targetKey) {
      if (!isSilent) {
        showErrorAlert(
          'Port Already in Use',
          `COM port ${targetKey} is already connected to Laser Port. Please select a different COM port for USB Port.`
        );
      }
      setOpticalStatus(prev => ({ ...prev, checking: false }));
      return false;
    }

    setOpticalStatus(prev => ({ ...prev, checking: true }));

    try {
      const eff = getEffectiveSerialConfig(usbSerialConfig);
      const res = await stage09Service.connectOpticalPort({
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
        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            msg: `Connected to USB Port on ${res.friendlyName || res.port || portPath} @ ${summary}. Ready to scan!`,
            status: 'SUCCESS'
          },
          ...prev
        ]);
        return true;
      } else {
        try {
          localStorage.setItem('zenmeter_optical_was_connected', 'false');
        } catch (_) { }
        setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
        const errMsg = res?.message || 'Optical Port Not Detected. Please check physical cable connection.';
        if (!isSilent) {
          showErrorAlert('Optical Port Not Detected', errMsg);
        }
        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            msg: `[ERROR] Optical Port Not Detected: ${errMsg}`,
            status: 'ERROR'
          },
          ...prev
        ]);
        return false;
      }
    } catch (err) {
      try {
        localStorage.setItem('zenmeter_optical_was_connected', 'false');
      } catch (_) { }
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      if (!isSilent) {
        showErrorAlert('Optical Port Connection Error', err.message || 'Error connecting to Optical Port.');
      }
      return false;
    }
  };

  // Check laser machine serial COM status and scan available hardware ports
  const checkLaserStatus = async (isExplicitCheck = false) => {
    try {
      const devId = webSerialService.deviceId;
      const res = await stage09Service.getLaserStatus({
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
        setAvailableLaserPorts(detectedPorts);

        const isConnected = Boolean(res && res.connected);
        const rawPort = res?.port;
        const activePort = rawPort ? (extractPortKey(rawPort) || rawPort) : null;

        setLaserStatus(prev => {
          if (prev.source === 'client_webserial' && prev.connected) {
            return { ...prev, ports: detectedPorts, checking: false };
          }
          const summary = formatSerialSummary(laserSerialConfig);
          const friendly = isConnected
            ? (res.friendlyName || (activePort ? `Laser COM (${activePort}) (${summary})` : null))
            : null;
          return {
            ...prev,
            connected: isConnected,
            port: isConnected ? activePort : null,
            friendlyName: friendly,
            ports: detectedPorts,
            checking: false
          };
        });

        const portIsPresent = activePort && detectedPorts.some(p => extractPortKey(p.path) === extractPortKey(activePort));
        if (!isConnected && !portIsPresent) {
          try { localStorage.setItem('zenmeter_laser_was_connected', 'false'); } catch (_) { }
        }

        if (detectedPorts.length > 0 && (!selectedLaserPort || isDummyPortName(selectedLaserPort))) {
          let savedPort = null;
          try {
            savedPort = localStorage.getItem('zenmeter_laser_last_port');
          } catch (_) { }
          const matched = savedPort && !isDummyPortName(savedPort) && detectedPorts.find(p => p.path && p.path.toLowerCase() === savedPort.toLowerCase());
          const chosen = (matched || detectedPorts[0]).path;
          setSelectedLaserPort(chosen);
          setSelectedLaserPortId(`laser_server_${chosen}`);
        }

        if (isExplicitCheck && !isConnected && detectedPorts.length === 0) {
          showErrorAlert('No Laser Port Detected', 'No COM ports detected on Server PC for laser machine. Please verify USB/Serial cable connection.');
        }
      } else {
        const localPaired = await refreshPairedLaserPorts();
        setLaserStatus(prev => ({
          ...prev,
          checking: false,
          ports: localPaired
        }));

        const freeLaserPort = localPaired.find(p => !p.isUsedByOptical && (!webSerialService?.port || webSerialService.port !== p.port));
        const freeIdx = freeLaserPort ? localPaired.indexOf(freeLaserPort) : -1;

        if (freeIdx >= 0 && (!selectedLaserPortId || selectedLaserPortId.startsWith('laser_server_'))) {
          setSelectedLaserPortId(`laser_paired_${freeIdx}`);
          setSelectedLaserPort(localPaired[freeIdx].friendlyName);
        } else if (freeIdx < 0 && (!selectedLaserPortId || selectedLaserPortId.startsWith('laser_server_'))) {
          setSelectedLaserPortId('__laser_pair_new__');
          setSelectedLaserPort('');
        }
      }
    } catch (err) {
      console.warn('Error checking laser port status:', err);
      setLaserStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
      try { localStorage.setItem('zenmeter_laser_was_connected', 'false'); } catch (_) { }
      if (isExplicitCheck) {
        showErrorAlert('Laser Port Error', 'Unable to check laser port: ' + (err.message || 'Error'));
      }
    }
  };

  // Connect to Laser Machine via Web Serial on this laptop
  const handleConnectLaser = async (targetPortInstance = null, forceNewChooser = false) => {
    setLaserStatus(prev => ({ ...prev, checking: true }));
    try {
      const eff = getEffectiveSerialConfig(laserSerialConfig);
      let res = null;
      if (forceNewChooser) {
        res = await laserWebSerialService.requestPortAndConnect(eff);
      } else if (targetPortInstance) {
        if ((webSerialService?.port === targetPortInstance && webSerialService?.connected) || (targetPortInstance.readable !== null && laserWebSerialService.port !== targetPortInstance)) {
          // If port is already used by Optical Port, prompt device picker to choose Laser cable
          res = await laserWebSerialService.requestPortAndConnect(eff);
        } else {
          res = await laserWebSerialService.connectPort(targetPortInstance, eff);
        }
      } else {
        const list = await laserWebSerialService.getPairedPorts();
        const freePort = list.find(p => !p.isUsedByOptical && (!webSerialService?.port || webSerialService.port !== p.port) && (!p.port.readable || laserWebSerialService.port === p.port));
        if (freePort) {
          res = await laserWebSerialService.connectPort(freePort.port, eff);
        } else {
          res = await laserWebSerialService.requestPortAndConnect(eff);
        }
      }

      if (res && res.success) {
        try {
          localStorage.setItem('zenmeter_laser_was_connected', 'true');
          localStorage.setItem('zenmeter_laser_last_port', res.portName);
          localStorage.setItem('zenmeter_laser_source', 'client_webserial');
          localStorage.setItem('zenmeter_laser_manual_disconnect', 'false');
        } catch (_) { }

        const summary = formatSerialSummary(laserSerialConfig);
        const refreshedList = await laserWebSerialService.getPairedPorts();
        const filtered = (refreshedList || []).filter(p => !isDummyPortName(p.friendlyName));
        setPairedLaserPorts(filtered);
        const newIdx = filtered.findIndex(p => p.port === laserWebSerialService.port);
        setSelectedLaserPortId(newIdx >= 0 ? `laser_paired_${newIdx}` : 'laser_paired_0');
        setSelectedLaserPort(res.portName);

        setLaserStatus({
          connected: true,
          port: res.portName,
          friendlyName: `${res.portName} (${summary})`,
          baudRate: eff.baudRate,
          source: 'client_webserial',
          ports: availableLaserPorts,
          checking: false
        });

        if (lastReadMeterData) {
          laserWebSerialService.setActiveMeter(lastReadMeterData);
        }

        setShowLaserSettings(false);
        return true;
      }
    } catch (err) {
      setLaserStatus(prev => ({ ...prev, connected: false, checking: false }));
      const isUserCancel = err.message && (err.message.includes('No serial port selected') || err.message.includes('NotFoundError'));
      if (!isUserCancel) {
        showErrorAlert('Laser Connection Failed', err.message || 'Unable to connect to Laser port.');
      }
      return false;
    }
  };

  // Connect to Laser Machine on server COM port
  const handleConnectServerLaserPort = async (portPath) => {
    const targetKey = extractPortKey(portPath);

    // Prevent connecting to the same COM port that USB Port is currently using
    if (opticalStatus.connected && opticalStatus.port && extractPortKey(opticalStatus.port) === targetKey) {
      showErrorAlert(
        'Port Already in Use',
        `COM port ${targetKey} is already connected to USB Port. Please select a different COM port for Laser Port.`
      );
      setLaserStatus(prev => ({ ...prev, checking: false }));
      return false;
    }

    setLaserStatus(prev => ({ ...prev, checking: true }));
    try {
      const cleanPath = targetKey || portPath;
      const eff = getEffectiveSerialConfig(laserSerialConfig);
      const res = await stage09Service.connectLaserPort({
        port: cleanPath,
        baudRate: eff.baudRate,
        dataBits: eff.dataBits,
        parity: eff.parity,
        stopBits: eff.stopBits,
        parityErrorChar: eff.parityErrorChar,
        deviceId: webSerialService.deviceId,
        tunnelId: opticalStatus.tunnelId
      });
      if (res && res.success && res.connected) {
        const connectedPort = res.port ? (extractPortKey(res.port) || res.port) : cleanPath;
        try {
          localStorage.setItem('zenmeter_laser_was_connected', 'true');
          localStorage.setItem('zenmeter_laser_last_port', connectedPort);
          localStorage.setItem('zenmeter_laser_source', 'server');
          localStorage.setItem('zenmeter_laser_manual_disconnect', 'false');
        } catch (_) { }

        const summary = formatSerialSummary(laserSerialConfig);
        setLaserStatus({
          connected: true,
          port: connectedPort,
          friendlyName: `Laser COM (${connectedPort}) (${summary})`,
          baudRate: eff.baudRate,
          source: 'server',
          ports: availableLaserPorts,
          checking: false
        });
        setSelectedLaserPort(connectedPort);
        setSelectedLaserPortId(`laser_server_${connectedPort}`);
        setShowLaserSettings(false);

        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            msg: `Laser Machine COM port connected on ${res.friendlyName || res.port || portPath} @ ${summary}. Ready for laser printing!`,
            status: 'SUCCESS'
          },
          ...prev
        ]);
        return true;
      } else {
        setLaserStatus(prev => ({ ...prev, connected: false, checking: false }));
        showErrorAlert('Connection Failed', res?.message || 'Could not connect to Laser Machine serial port.');
        return false;
      }
    } catch (err) {
      setLaserStatus(prev => ({ ...prev, connected: false, checking: false }));
      showErrorAlert('Laser Port Connection Error', err.message || 'Error connecting to Laser Machine.');
      return false;
    }
  };

  // Disconnect Laser Machine Serial Port (Web Serial or server)
  const handleDisconnectLaserPort = async () => {
    setLaserStatus(prev => ({ ...prev, checking: true }));
    try {
      if (laserStatus.source === 'client_webserial') {
        await laserWebSerialService.disconnect();
      } else {
        await stage09Service.disconnectLaserPort();
      }
      try {
        localStorage.setItem('zenmeter_laser_was_connected', 'false');
        localStorage.setItem('zenmeter_laser_manual_disconnect', 'true');
      } catch (_) { }
      setLaserStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
      setPrintLogs(prev => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          msg: `Laser Machine port disconnected.`,
          status: 'INFO'
        },
        ...prev
      ]);
    } catch (err) {
      setLaserStatus(prev => ({ ...prev, connected: false, checking: false }));
    }
  };

  // Hardware unplug disconnection handler for Laser Port
  const handleHardwareLaserDisconnection = async (reason = 'Laser Port disconnected.') => {
    try {
      if (laserWebSerialService.port) {
        await laserWebSerialService.disconnect();
      }
    } catch (_) { }
    try {
      localStorage.setItem('zenmeter_laser_was_connected', 'false');
    } catch (_) { }
    setLaserStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
    setPrintLogs(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        msg: `[HARDWARE] ${reason}`,
        status: 'WARNING'
      },
      ...prev
    ]);
  };

  // Optional simulation helper to test Laser F1/F2/F3 handshake
  const handleSimulateLaserAsk = async (command = 'ALL') => {
    try {
      const res = await stage09Service.simulateLaserAsk({ command });
      if (res && res.success) {
        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            msg: `[TEST SIMULATION] Sent test query ${command} to Laser Serial handler.`,
            status: 'INFO'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    }
  };

  // Connect Optical Port: connects browser Web Serial on this laptop or local server COM port
  const handleConnectCable = async (targetPortInstance = null, forceNewChooser = false, isSilent = false) => {
    manualDisconnectedRef.current = false;
    setOpticalStatus(prev => ({ ...prev, checking: true }));

    // 1. Try local laptop Web Serial if supported natively (e.g. Chrome flag set or HTTPS)
    if (webSerialService.hasNativeSerial()) {
      try {
        const eff = getEffectiveSerialConfig(usbSerialConfig);
        let res = null;
        if (forceNewChooser) {
          res = await webSerialService.requestPortAndConnect(currentOperatorId, eff);
        } else if (targetPortInstance) {
          if ((laserWebSerialService?.port === targetPortInstance && laserWebSerialService?.connected) || (targetPortInstance.readable !== null && webSerialService.port !== targetPortInstance)) {
            // Port already in use by Laser Port, prompt picker for Optical Cable
            res = await webSerialService.requestPortAndConnect(currentOperatorId, eff);
          } else {
            res = await webSerialService.connectPort(targetPortInstance, currentOperatorId, eff);
          }
        } else {
          const list = await webSerialService.getPairedPorts();
          const freePort = list.find(p => !p.isUsedByLaser && (!laserWebSerialService?.port || laserWebSerialService.port !== p.port) && (!p.port.readable || webSerialService.port === p.port));
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
          setPrintLogs(prev => [
            {
              id: Date.now(),
              time: new Date().toLocaleTimeString(),
              msg: `Optical Port connected directly to this laptop (${res.portName}). Only this laptop has access. Ready to scan!`,
              status: 'SUCCESS'
            },
            ...prev
          ]);
          return true;
        }
      } catch (err) {
        setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
        const isUserCancel = err.message && (err.message.includes('No serial port selected') || err.message.includes('NotFoundError'));
        const errMsg = isUserCancel ? 'No port selected.' : (err.message || 'Optical Port Not Detected.');
        if (!isSilent && !isUserCancel) {
          showErrorAlert('Optical Port Not Detected', errMsg);
        }
        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            msg: `[ERROR] Optical Port Not Detected: ${errMsg}`,
            status: 'ERROR'
          },
          ...prev
        ]);
        return false;
      }
    } else if (webSerialService.isChromium() && !webSerialService.isSecureContext()) {
      // 1st time on another laptop: Chrome flag is not enabled yet
      setOpticalStatus(prev => ({ ...prev, checking: false }));
      if (!isSilent) {
        setShowInsecureHelpModal(true);
      }
      return false;
    }

    const isRemoteLaptop = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isRemoteLaptop) {
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      if (!isSilent) {
        showErrorAlert(
          'Connect Cable to This Laptop',
          'Please plug the USB Cable directly into this laptop. Server-attached cables cannot be accessed from remote workstations.'
        );
      }
      return false;
    }

    // Local server machine COM port connection:
    const targetServerPort = selectedOpticalPort || (availableOpticalPorts && availableOpticalPorts.length > 0 ? availableOpticalPorts[0].path : null);
    if (!targetServerPort) {
      setOpticalStatus(prev => ({ ...prev, connected: false, checking: false }));
      if (!isSilent) {
        showErrorAlert('Optical Port Not Detected', 'No COM port detected. Please plug the USB Cable into this computer.');
      }
      setPrintLogs(prev => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          msg: '[ERROR] Optical Port Not Detected: No physical port found.',
          status: 'ERROR'
        },
        ...prev
      ]);
      return false;
    }

    return await handleConnectServerPort(targetServerPort, isSilent);
  };

  // Handle disconnection of USB cable (either unplugged physically or disconnected by operator)
  const handleHardwareDisconnection = async (reason = 'Optical Port disconnected.', isUserInitiated = false) => {
    manualDisconnectedRef.current = isUserInitiated;

    try {
      if (isUserInitiated) {
        localStorage.setItem('zenmeter_optical_was_connected', 'false');
        localStorage.setItem('zenmeter_optical_manual_disconnect', 'true');
      }
    } catch (_) { }

    const prevPort = opticalStatusRef.current?.friendlyName || opticalStatusRef.current?.port || selectedOpticalPortRef.current || 'Optical Port';

    // 1. Immediately reset connection state to Disconnected
    setOpticalStatus(prev => ({
      ...prev,
      connected: false,
      checking: false,
      source: null,
      tunnelId: null
    }));

    // 2. Disable meter reading by clearing read data and status
    setLastReadMeterData(null);
    setReadMeterStatusMsg(null);
    setIsReadingOptical(false);

    // 3. Release client WebSerial port if any
    try {
      await webSerialService.disconnect();
    } catch (_) { }

    // 4. Release backend COM port
    try {
      await stage09Service.disconnectOpticalPort({ port: selectedOpticalPortRef.current || opticalStatusRef.current?.port });
    } catch (_) { }

    // 5. Append disconnection message to terminal logs
    setPrintLogs(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        msg: `[DISCONNECTED] ${prevPort} disconnected: ${reason} Meter reading and laser printing disabled.`,
        status: 'INFO'
      },
      ...prev
    ]);

    // 6. Refresh paired ports and available server ports
    try {
      if (webSerialService.hasNativeSerial()) {
        await refreshPairedPorts();
      }
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        const res = await stage09Service.getOpticalStatus({ allow_server_port: 'true' });
        if (res && Array.isArray(res.ports)) {
          setAvailableOpticalPorts(res.ports);
          setOpticalStatus(prev => ({ ...prev, ports: res.ports }));
        }
      }
    } catch (_) { }
  };

  // Handle Disconnect / Connect of Optical Cable (Single unified toggle)
  const handleToggleOpticalConnection = async () => {
    if (opticalStatus.connected) {
      await handleHardwareDisconnection('Disconnected by operator.', true);
    } else {
      await handleConnectCable();
    }
  };

  // Sync live progress counters returned by backend Stage 9 API responses
  const syncProgressFromResponse = (res, fallbackCount = null) => {
    if (!res) return;
    if (typeof res.batch_completed_count === 'number') {
      setBatchCompletedCount(res.batch_completed_count);
      setWorkForms(prev => prev.map(f => {
        if (f.form_id === activeFormId || f.id === activeFormId) {
          return { ...f, completed_quantity: res.batch_completed_count };
        }
        return f;
      }));
    }
    if (typeof res.target_quantity === 'number' && res.target_quantity > 0) {
      setDbTargetQuantity(res.target_quantity);
    }
    if (typeof res.operator_completed_count === 'number') {
      setOperatorCompletedCount(res.operator_completed_count);
    } else if (typeof res.batch_completed_count === 'number') {
      setOperatorCompletedCount(res.batch_completed_count);
    } else if (typeof fallbackCount === 'number') {
      setOperatorCompletedCount(fallbackCount);
    }
  };

  // Load saved meter records from DB for active work order & stage (all operators combined total in batchCompletedCount)
  const loadSavedRecords = async (wId, silent = false) => {
    if (!wId || wId === 'UNASSIGNED') {
      setOperatorCompletedCount(0);
      setBatchCompletedCount(0);
      setDbTargetQuantity(null);
      return;
    }
    if ((isOperator || isSupervisor || isQC) && !currentOperatorId) {
      return;
    }
    if (!silent) setLoadingRecords(true);
    try {
      const matchedForm = workForms.find(f => String(f.form_id) === String(wId) || String(f.id) === String(wId));
      const dynamicStageId = matchedForm?.stage_number || stageId || null;
      const queryParams = {};
      if (dynamicStageId) {
        queryParams.stage_id = dynamicStageId;
      }
      if (currentOperatorId) {
        if (isOperator) {
          queryParams.operator_id = currentOperatorId;
          queryParams.role_type = 'OPERATOR';
        } else if (isSupervisor) {
          queryParams.operator_id = currentOperatorId;
          queryParams.role_type = 'SUPERVISOR';
        } else if (isQC) {
          queryParams.operator_id = currentOperatorId;
          queryParams.role_type = 'QC';
        }
      }
      const res = await stage09Service.getRecords(wId, queryParams);
      if (res && res.success && Array.isArray(res.data)) {
        setSavedMeterRecords(res.data);
        const printedCount = res.data.filter(r => r.print === 'printed' || r.print === 'PRINTED').length;
        syncProgressFromResponse(res, printedCount);
      }
    } catch (err) {
      console.warn('Error loading stage 9 records:', err);
    } finally {
      if (!silent) setLoadingRecords(false);
    }
  };

  // Validate combined operators' tests haven't reached Work ID target quantity before starting next test
  const checkOperatorTargetLimitReached = () => {
    const printedCount = (savedMeterRecords || []).filter(r => r.print === 'printed' || r.print === 'PRINTED').length;
    const effectiveBatchCount = typeof batchCompletedCount === 'number'
      ? batchCompletedCount
      : printedCount;
    if (effectiveBatchCount >= targetQuantity) {
      return `Batch Target Reached (${effectiveBatchCount} / ${targetQuantity} Meters completed for Work ID '${activeFormId}'). Cannot test meter #${effectiveBatchCount + 1}.`;
    }
    return null;
  };

  const formatFriendlyOpticalError = (rawMessage) => {
    const msg = String(rawMessage || '').trim();
    const lower = msg.toLowerCase();

    if (lower.includes('duplicate')) {
      return {
        title: 'Duplicate Meter Detected',
        message: 'Duplicate Meter Detected! This meter is already registered.'
      };
    }

    if (lower.includes('target reached') || lower.includes('cannot test meter')) {
      return {
        title: 'Batch Target Completed',
        message: msg
      };
    }
    if (
      lower.includes('not connected') ||
      lower.includes('serial port is not open') ||
      lower.includes('access denied') ||
      lower.includes('file not found') ||
      lower.includes('cannot open') ||
      lower.includes('port is busy')
    ) {
      return {
        title: 'Optical Cable Not Connected',
        message: 'Unable to reach the USB optical cable. Please check that the cable is plugged in properly and not used by another application, then try again.'
      };
    }
    if (
      lower.includes('did not respond') ||
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('application association') ||
      lower.includes('no aare') ||
      lower.includes('hdlc') ||
      lower.includes('dlms error code') ||
      lower.includes('obis')
    ) {
      return {
        title: 'Unable to Read Meter',
        message: 'No response was received from the meter. Please make sure the meter is powered on and the optical probe is placed straight and firmly on the meter port, then try again.'
      };
    }
    if (
      lower.includes('network error') ||
      lower.includes('failed to fetch') ||
      lower.includes('database pool') ||
      lower.includes('econnrefused') ||
      lower.includes('500')
    ) {
      return {
        title: 'Connection Error',
        message: 'Could not communicate with the server right now. Please check your network connection and try again.'
      };
    }
    if (lower.includes('not installed')) {
      return {
        title: 'Reader Setup Incomplete',
        message: 'Required optical reader software is missing on this computer. Please contact IT support.'
      };
    }
    return {
      title: 'Meter Read Failed',
      message: msg || 'Unable to read the meter right now. Please check the optical cable and meter power, then try again.'
    };
  };

  // Handle Reading Meter via Optical Probe DLMS
  const handleReadMeterOptical = async () => {
    if (!opticalStatus.connected) {
      showErrorAlert('Optical Cable Required', 'Optical cable is disconnected. Please connect the USB Optical Cable before reading meter.');
      return;
    }

    if (!activeFormId || activeFormId === 'UNASSIGNED') {
      showErrorAlert('Work Order Required', 'Please select an active Work ID first before reading a meter.');
      return;
    }

    const targetLimitError = checkOperatorTargetLimitReached();
    if (targetLimitError) {
      setReadMeterStatusMsg(null);
      setLastReadMeterData(null);
      setPrintLogs(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), msg: `BLOCKED: ${targetLimitError}`, status: 'ERROR' },
        ...prev
      ]);
      showErrorAlert('Batch Target Completed', targetLimitError);
      return;
    }

    setReadMeterStatusMsg(null);
    setLastReadMeterData(null);
    setIsReadingOptical(true);
    const startTimeStr = new Date().toLocaleTimeString();

    // Add pending log
    setPrintLogs(prev => [
      { id: Date.now(), time: startTimeStr, msg: `Initiating DLMS optical probe read on ${selectedOpticalPort || opticalStatus.port || 'Optical Port'}...`, status: 'INFO' },
      ...prev
    ]);

    try {
      const targetPort = selectedOpticalPort || opticalStatus.port || null;
      const activeForm = workForms.find(f => String(f.form_id) === String(activeFormId) || String(f.id) === String(activeFormId));
      const dynamicStageId = activeForm?.stage_number || stageId || null;
      const effectiveTunnelId = opticalStatus.source === 'client_webserial' ? (opticalStatus.tunnelId || webSerialService.tunnelId) : null;
      const effectiveDeviceId = webSerialService.deviceId;
      const res = await stage09Service.readMeter({
        port: targetPort,
        work_id: activeFormId,
        stage_id: dynamicStageId,
        operator_id: currentOperatorId || 'OPERATOR',
        operator_name: currentUser?.name || currentUser?.user_name || null,
        user_role: currentUser?.role || null,
        tunnel_id: effectiveTunnelId,
        device_id: effectiveDeviceId
      });

      if (res && res.success && res.meterData) {
        const { meterData, savedRecord, logs } = res;
        const validSerial = meterData.serialNo ? String(meterData.serialNo).trim() : '';
        const validImei = meterData.imeiNo ? String(meterData.imeiNo).trim() : '';
        let validNic = meterData.nicSrNo ? String(meterData.nicSrNo).trim() : '';
        if (validSerial && (validNic === `NIC-${validSerial}` || validNic === `NIC-ZG-${validSerial}`)) {
          validNic = '';
        }

        // Missing fields check: Serial No, IMEI No, and NIC Sr. No
        const currentMissing = Array.isArray(res.missingFields) && res.missingFields.length > 0
          ? res.missingFields
          : [
            isEmptyValue(validSerial) && 'Serial No',
            isEmptyValue(validImei) && 'IMEI No',
            isEmptyValue(validNic) && 'NIC Sr.No'
          ].filter(Boolean);

        const isIncomplete = Boolean(
          res.isIncomplete ||
          res.savedToDb === false ||
          currentMissing.length > 0 ||
          !savedRecord
        );

        // Append detailed DLMS logs to terminal stream first so operator sees what happened
        if (Array.isArray(logs) && logs.length > 0) {
          setPrintLogs(prev => [...logs, ...prev]);
        }

        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // =========================================================================
        // CASE 1: Incomplete meter readout (Missing 1, 2, or 3 numbers)
        // -> DO NOT SAVE TO DB! Show error message explaining why DB was not saved.
        // =========================================================================
        if (isIncomplete) {
          const incompleteRecordData = {
            ...meterData,
            serialNo: validSerial,
            imeiNo: validImei,
            nicSrNo: validNic,
            deviceNo: meterData.deviceNo || '',
            recordId: null,
            savedToDb: false,
            isIncomplete: true,
            missingFields: currentMissing,
            print: null,
            printAt: null,
            isAlreadyPrinted: false
          };
          setLastReadMeterData(incompleteRecordData);

          // Update live config so the UI immediately shows whatever data was read from the physical meter
          setCurrentConfig(prev => ({
            ...prev,
            recordId: null,
            serialNo: validSerial,
            imei: validImei,
            deviceNo: meterData.deviceNo || '',
            nicsrno: validNic
          }));

          // Reload DB records so table reflects true DB state (0 records added)
          await loadSavedRecords(activeFormId);

          const missingText = currentMissing.join(', ');
          const statusText = `❌ Missing ${missingText} from meter — NOT saved to Database`;
          setReadMeterStatusMsg({
            text: statusText,
            time: timeLabel,
            type: 'INCOMPLETE'
          });

          setPrintLogs(prev => [
            {
              id: Date.now(),
              time: timeLabel,
              msg: `[DB SAVE REJECTED] Incomplete meter readout. Missing: ${missingText}. All 3 numbers (Serial No, IMEI No, NIC Sr.No) are required. Data was NOT saved to DB.`,
              status: 'ERROR'
            },
            ...prev
          ]);

          // Show compact small modal popup to operator explaining why DB was not saved
          await Swal.fire({
            width: '380px',
            padding: '0.75rem',
            showCancelButton: true,
            confirmButtonText: 'Understood',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            buttonsStyling: false,
            customClass: {
              popup: 'rounded-3 shadow border p-2.5',
              actions: 'gap-2 mt-2 w-100 justify-content-end',
              confirmButton: 'btn btn-sm btn-danger px-2.5 py-1 fw-semibold',
              cancelButton: 'btn btn-sm btn-secondary px-2.5 py-1 fw-semibold'
            },
            html: `
              <div class="text-start" style="font-size: 10px;">
                <div class="d-flex align-items-center gap-1.5 mb-2 pb-1 border-bottom text-danger fw-bold" style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <i class="ti ti-alert-triangle fs-6"></i>
                  <span>Meter Read Incomplete — Not Saved to Database</span>
                </div>
                <div class="mb-2 p-2 bg-light rounded border">
                  <div class="fw-bold text-dark mb-1 pb-1 border-bottom" style="font-size: 9px;">Data Retrieved from Physical Meter:</div>
                  <div class="font-mono" style="font-size: 9px;">
                    <div class="d-flex justify-content-between py-0.5 border-bottom border-light">
                      <span class="text-secondary">Serial No:</span>
                      <strong>${validSerial ? `<span class="text-success">${validSerial}</span>` : '<span class="text-danger fw-bold">MISSING</span>'}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-0.5 border-bottom border-light">
                      <span class="text-secondary">IMEI No:</span>
                      <strong>${validImei ? `<span class="text-success">${validImei}</span>` : '<span class="text-danger fw-bold">MISSING</span>'}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-0.5">
                      <span class="text-secondary">NIC Sr.No:</span>
                      <strong>${validNic ? `<span class="text-success">${validNic}</span>` : '<span class="text-danger fw-bold">MISSING</span>'}</strong>
                    </div>
                  </div>
                </div>
                <div class="alert alert-danger mb-0 p-2 rounded-2" style="font-size: 9px; line-height: 1.4;">
                  <div class="fw-bold mb-1 d-flex align-items-center gap-1">
                    <i class="ti ti-info-circle"></i>
                    <span>Why was this read data NOT saved to DB?</span>
                  </div>
                  <div>
                    The system requires <strong>all 3 numbers (Serial No, IMEI No, and NIC Sr.No)</strong> from the meter before saving to the database.
                    Because <span class="badge bg-danger text-white py-0.5 px-1">${missingText}</span> was missing from the meter readout, 
                    <strong>this read data was NOT saved to the database</strong>.
                  </div>
                  <div class="mt-1 text-muted" style="font-size: 8px;">
                    Please verify optical probe alignment or meter configuration and read meter again.
                  </div>
                </div>
              </div>
            `,
            didOpen: () => {
              const confirmBtn = Swal.getConfirmButton();
              const cancelBtn = Swal.getCancelButton();
              if (confirmBtn) confirmBtn.style.fontSize = '10px';
              if (cancelBtn) cancelBtn.style.fontSize = '10px';
            }
          });
          return;
        }

        // =========================================================================
        // CASE 2: All 3 numbers present and successfully saved to PostgreSQL!
        // =========================================================================
        const isAlreadyPrinted = Boolean(
          res.isAlreadyPrinted ||
          savedRecord?.print === 'printed' ||
          savedRecord?.print === 'PRINTED'
        );

        const validRecordData = {
          ...meterData,
          serialNo: validSerial,
          imeiNo: validImei,
          nicSrNo: validNic,
          recordId: savedRecord?.id || null,
          savedToDb: true,
          isIncomplete: false,
          missingFields: [],
          print: savedRecord?.print || (isAlreadyPrinted ? 'printed' : null),
          printAt: savedRecord?.print_at || savedRecord?.printAt || null,
          isAlreadyPrinted
        };
        setLastReadMeterData(validRecordData);
        laserWebSerialService.setActiveMeter(validRecordData);

        // Update live config so the laser marking template and UI immediately reflect the read values
        setCurrentConfig(prev => ({
          ...prev,
          recordId: savedRecord?.id || null,
          serialNo: validSerial,
          imei: validImei,
          deviceNo: meterData.deviceNo || '',
          nicsrno: validNic
        }));

        syncProgressFromResponse(res);

        // Refresh database records and reset to page 1 so latest meter shows at top
        await loadSavedRecords(activeFormId);
        setRecordsPage(1);

        const isDuplicateRecord = Boolean(res.action === 'EXISTING' || res.isDuplicate || savedRecord?.action === 'EXISTING');

        if (isAlreadyPrinted) {
          const printedMsg = `Duplicate Meter: This meter data (${validSerial}) is already registered and already printed. Laser Print disabled.`;
          setReadMeterStatusMsg({
            text: `❌ Duplicate meter: Already registered & already printed — Laser Print disabled`,
            time: timeLabel,
            type: 'ALREADY_PRINTED'
          });
          setPrintLogs(prev => [
            { id: Date.now(), time: timeLabel, msg: `[ALREADY PRINTED] ${printedMsg}`, status: 'ERROR' },
            ...prev
          ]);
        } else if (isDuplicateRecord) {
          // All 3 numbers already in DB, and print is null (not printed yet)
          const dupUnprintedMsg = `This data is duplicate (already registered in database) — Print status: Pending (null).`;
          setReadMeterStatusMsg({
            text: `⚠️ Duplicate record found (${validSerial}) — Not printed yet, Laser Print enabled`,
            time: timeLabel,
            type: 'DUPLICATE_UNPRINTED'
          });
          setPrintLogs(prev => [
            { id: Date.now(), time: timeLabel, msg: `[DUPLICATE UNPRINTED] ${dupUnprintedMsg}`, status: 'WARNING' },
            ...prev
          ]);
        } else if (res.action === 'UPDATED' || res.isUpdated) {
          setReadMeterStatusMsg({
            text: `Meter details updated with new value (${validSerial}) — Ready for Laser Print`,
            time: timeLabel,
            type: 'SUCCESS'
          });
          setPrintLogs(prev => [
            { id: Date.now(), time: timeLabel, msg: `Meter details updated with new value (${validSerial}) — Ready for Laser Print`, status: 'SUCCESS' },
            ...prev
          ]);
        } else {
          setReadMeterStatusMsg({
            text: `Meter read & saved (${validSerial}) — Ready for Laser Print`,
            time: timeLabel,
            type: 'SUCCESS'
          });
          setPrintLogs(prev => [
            { id: Date.now(), time: timeLabel, msg: `Meter read & saved (${validSerial}) — Ready for Laser Print`, status: 'SUCCESS' },
            ...prev
          ]);
        }
      } else {
        setLastReadMeterData(null);
        throw new Error(res?.message || 'Incomplete meter data received from optical probe.');
      }
    } catch (err) {
      console.error('Error reading meter via optical probe:', err);
      setLastReadMeterData(null);
      const isAlreadyPrinted = Boolean(err?.response?.data?.isAlreadyPrinted);
      const isDuplicate = err?.response?.data?.duplicate || (err?.message && err.message.includes('Duplicate Meter Detected'));
      const errMsg = err?.response?.data?.message || err?.message || 'Could not communicate with meter over optical probe.';
      const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (isAlreadyPrinted) {
        const dupMsg = errMsg || 'Duplicate Meter: This meter has already been laser printed.';
        setReadMeterStatusMsg({
          text: `❌ Duplicate meter: Already registered & already printed — Laser Print disabled`,
          time: timeLabel,
          type: 'ALREADY_PRINTED'
        });
        setPrintLogs(prev => [
          { id: Date.now(), time: timeLabel, msg: `[ALREADY PRINTED] ${dupMsg}`, status: 'ERROR' },
          ...prev
        ]);
      } else if (isDuplicate) {
        const dupMsg = errMsg || 'Duplicate Meter: This data is duplicate (already registered in database).';
        setReadMeterStatusMsg({
          text: `❌ Duplicate meter: Data already registered in database`,
          time: timeLabel,
          type: 'ERROR'
        });
        setPrintLogs(prev => [
          { id: Date.now(), time: timeLabel, msg: `[DUPLICATE BLOCKED] ${dupMsg}`, status: 'ERROR' },
          ...prev
        ]);
      } else if (err?.response?.data?.validationError || err?.response?.data?.missingFields) {
        const missing = err?.response?.data?.missingFields || [];
        const missingText = missing.join(', ') || 'Serial No, IMEI No, or NIC Sr.No';
        setReadMeterStatusMsg({
          text: `❌ Missing ${missingText} — NOT saved to Database`,
          time: timeLabel,
          type: 'INCOMPLETE'
        });
        setPrintLogs(prev => [
          { id: Date.now(), time: timeLabel, msg: `[DB SAVE REJECTED] Missing: ${missingText}. All 3 numbers are required. Record NOT saved to DB.`, status: 'ERROR' },
          ...prev
        ]);
        await Swal.fire({
          width: '380px',
          padding: '0.75rem',
          showCancelButton: true,
          confirmButtonText: 'Understood',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-3 shadow border p-2.5',
            actions: 'gap-2 mt-2 w-100 justify-content-end',
            confirmButton: 'btn btn-sm btn-danger px-2.5 py-1 fw-semibold',
            cancelButton: 'btn btn-sm btn-secondary px-2.5 py-1 fw-semibold'
          },
          html: `
            <div class="text-start" style="font-size: 10px;">
              <div class="d-flex align-items-center gap-1.5 mb-2 pb-1 border-bottom text-danger fw-bold" style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                <i class="ti ti-alert-triangle fs-6"></i>
                <span>Meter Read Incomplete — Not Saved to Database</span>
              </div>
              <div class="alert alert-danger mb-0 p-2 rounded-2" style="font-size: 9px; line-height: 1.4;">
                <div>
                  Cannot save to database. All 3 numbers (Serial No, IMEI No, and NIC Sr.No) are required from the meter.
                  Missing: <span class="badge bg-danger text-white py-0.5 px-1">${missingText}</span>.
                </div>
              </div>
            </div>
          `,
          didOpen: () => {
            const confirmBtn = Swal.getConfirmButton();
            const cancelBtn = Swal.getCancelButton();
            if (confirmBtn) confirmBtn.style.fontSize = '10px';
            if (cancelBtn) cancelBtn.style.fontSize = '10px';
          }
        });
      } else {
        const friendly = formatFriendlyOpticalError(errMsg);
        setReadMeterStatusMsg({
          text: `⚠️ ${friendly.title}: ${friendly.message}`,
          time: timeLabel,
          type: 'ERROR'
        });
        setPrintLogs(prev => [
          { id: Date.now(), time: timeLabel, msg: `${friendly.title}: ${errMsg}`, status: 'ERROR' },
          ...prev
        ]);
        if (errMsg.toLowerCase().includes('target reached')) {
          await loadSavedRecords(activeFormId);
        }
        if (friendly.title.includes('Optical Cable Not Connected') || friendly.title.includes('Batch Target')) {
          showErrorAlert(friendly.title, friendly.message);
        }
      }
    } finally {
      setIsReadingOptical(false);
    }
  };

  const renderReadMeterStatusLine = (extraClass = '') => {
    if (!readMeterStatusMsg) return null;
    const type = readMeterStatusMsg.type || 'SUCCESS';
    const isError = type === 'ERROR' || type === 'ALREADY_PRINTED' || type === 'INCOMPLETE';
    const isWarning = type === 'WARNING' || type === 'DUPLICATE_UNPRINTED';
    const colorClass = isError ? 'text-danger' : isWarning ? 'text-warning-emphasis' : 'text-success';
    const bgClass = isError ? 'bg-danger-subtle border border-danger-subtle' : isWarning ? 'bg-warning-subtle border border-warning-subtle' : 'bg-success-subtle border border-success-subtle';
    const iconClass = isError ? 'ti-circle-x' : isWarning ? 'ti-alert-triangle' : 'ti-circle-check';
    return (
      <div
        className={`d-flex align-items-center gap-2 ${colorClass} ${bgClass} rounded px-2.5 py-1.5 small fw-semibold text-truncate ${extraClass}`.trim()}
        title={readMeterStatusMsg.text}
      >
        <i className={`ti ${iconClass} fs-6 flex-shrink-0`}></i>
        <span className="text-truncate">{readMeterStatusMsg.text}</span>
        <span className="text-muted fw-normal font-mono flex-shrink-0 ms-auto" style={{ fontSize: '0.75rem' }}>
          ({readMeterStatusMsg.time})
        </span>
      </div>
    );
  };

  // Save updated NIC Sr. No directly to PostgreSQL database
  const saveUpdatedNicToDb = async (targetSerial, newNic) => {
    try {
      const activeForm = workForms.find(f => String(f.form_id) === String(activeFormId) || String(f.id) === String(activeFormId));
      const dynamicStageId = activeForm?.stage_number || stageId || null;

      const res = await stage09Service.saveMeter({
        work_id: activeFormId,
        stage_id: dynamicStageId,
        meter_serial_no: targetSerial,
        device_no: currentConfig.deviceNo || lastReadMeterData?.deviceNo || null,
        imei_no: currentConfig.imei || lastReadMeterData?.imeiNo || null,
        nic_sr_no: newNic,
        operator_id: currentOperatorId || 'OPERATOR',
        operator_name: currentUser?.name || currentUser?.user_name || null,
        user_role: currentUser?.role || null
      });

      if (res && res.success) {
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setCurrentConfig(prev => ({
          ...prev,
          nicsrno: newNic,
          recordId: res.data?.id || prev.recordId
        }));

        setLastReadMeterData(prev => ({
          ...(prev || {}),
          serialNo: targetSerial,
          imeiNo: currentConfig.imei || prev?.imeiNo,
          deviceNo: currentConfig.deviceNo || prev?.deviceNo,
          nicSrNo: newNic,
          recordId: res.data?.id || prev?.recordId || null,
          print: res.data?.print || prev?.print || null,
          printAt: res.data?.print_at || prev?.printAt || null,
          isAlreadyPrinted: Boolean(res.data?.print === 'printed' || res.data?.print === 'PRINTED')
        }));

        await loadSavedRecords(activeFormId);

        setReadMeterStatusMsg({
          text: `NIC Sr. No updated to ${newNic} for ${targetSerial} — Ready for Laser Print`,
          time: timeLabel,
          type: 'SUCCESS'
        });

        setPrintLogs(prev => [
          {
            id: Date.now(),
            time: timeLabel,
            msg: `[NIC UPDATED] Meter ${targetSerial}: NIC Sr. No updated to ${newNic} in database. Laser Print enabled.`,
            status: 'SUCCESS'
          },
          ...prev
        ]);

        showSuccessAlert(
          'Meter Updated',
          `NIC Sr. No for meter ${targetSerial} updated to ${newNic} in database successfully. Laser Print is now enabled!`
        );
      } else {
        throw new Error(res?.message || 'Failed to update meter in database.');
      }
    } catch (err) {
      console.error('Error updating NIC Sr. No:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Could not update meter record in database.';
      showErrorAlert('Update Failed', errMsg);
    }
  };

  // Prompt operator to enter or update NIC Sr. No
  const handlePromptUpdateNic = async (presetSerial, presetImei, presetNic) => {
    const targetSerial = presetSerial || currentConfig.serialNo || lastReadMeterData?.serialNo;
    const targetImei = presetImei || currentConfig.imei || lastReadMeterData?.imeiNo || '-';
    const currentNicVal = presetNic || ((currentConfig.nicsrno && currentConfig.nicsrno !== `NIC-${targetSerial}`) ? currentConfig.nicsrno : '');

    if (!targetSerial) {
      showErrorAlert('Meter Required', 'Please read a meter first before updating NIC Sr. No.');
      return;
    }

    const { value: enteredNic, isConfirmed } = await Swal.fire({
      title: 'Update NIC Sr. No',
      html: `
        <div class="text-start small mb-3 p-2.5 bg-light rounded font-mono border">
          <div><strong class="text-muted">Serial No:</strong> <span class="text-dark fw-bold">${targetSerial}</span></div>
          <div><strong class="text-muted">IMEI No:</strong> <span class="text-dark fw-bold">${targetImei}</span></div>
        </div>
        <div class="text-start fw-semibold mb-1 small text-dark">Enter or Scan NIC Sr. No:</div>
      `,
      input: 'text',
      inputPlaceholder: 'e.g. ABI1060001002',
      inputValue: currentNicVal,
      showCancelButton: true,
      confirmButtonText: 'Update & Save to Database',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#E66239',
      customClass: {
        popup: 'rounded-4 shadow-lg border-0 text-dark',
        confirmButton: 'px-4 py-2 fw-semibold rounded-3',
        cancelButton: 'px-4 py-2 fw-semibold rounded-3'
      },
      inputValidator: (val) => {
        if (!val || !val.trim() || val.trim() === '-') {
          return 'Please enter a valid NIC Sr. No';
        }
        return null;
      }
    });

    if (isConfirmed && enteredNic) {
      await saveUpdatedNicToDb(targetSerial, enteredNic.trim().toUpperCase());
    }
  };

  // Handle Demo Read Meter (Manual entry of meter_no, imei_no, nic_sr_no for Laser Print testing)
  const handleDemoReadMeter = async () => {
    if (!activeFormId || activeFormId === 'UNASSIGNED') {
      showErrorAlert('Work Order Required', 'Please select an active Work ID first before entering demo meter data.');
      return;
    }

    const defaultMeter = currentConfig.serialNo || '12345678';
    const defaultImei = currentConfig.imei || '1234567890123456';
    const defaultNic = currentConfig.nicsrno || '87654321';

    const { value: formValues } = await Swal.fire({
      title: '<div class="d-flex align-items-center justify-content-center gap-2"><i class="ti ti-forms text-primary"></i><span>Demo Read Meter</span></div>',
      html: `
        <div class="text-start small p-2">
          <p class="text-muted mb-3" style="font-size: 13px;">
            Manually enter the meter details below for laser testing. These demo values will <strong>NOT</strong> be saved to the database, but will be sent to the Laser Machine COM port when it queries <strong>F1</strong>, <strong>F2</strong>, or <strong>F3</strong>.
          </p>
          <div class="mb-3">
            <label class="form-label fw-bold small text-dark mb-1">
              <span class="badge bg-primary text-white me-1 font-mono">F3</span> Meter Serial No:
            </label>
            <input id="demo_meter_no" class="form-control form-control-sm font-mono" placeholder="e.g. 12345678" value="${defaultMeter}" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold small text-dark mb-1">
              <span class="badge bg-info text-white me-1 font-mono">F1</span> IMEI No:
            </label>
            <input id="demo_imei_no" class="form-control form-control-sm font-mono" placeholder="e.g. 1234567890123456" value="${defaultImei}" />
          </div>
          <div class="mb-2">
            <label class="form-label fw-bold small text-dark mb-1">
              <span class="badge bg-warning text-dark me-1 font-mono">F2</span> NIC Sr. No:
            </label>
            <input id="demo_nic_sr_no" class="form-control form-control-sm font-mono" placeholder="e.g. 87654321" value="${defaultNic}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="ti ti-check me-1"></i> Load Demo & Enable Laser Print',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6c757d',
      customClass: {
        popup: 'rounded-4 shadow-lg border-0 text-dark',
        confirmButton: 'px-3 py-2 fw-semibold rounded-3',
        cancelButton: 'px-3 py-2 fw-semibold rounded-3'
      },
      preConfirm: () => {
        const meterNo = document.getElementById('demo_meter_no')?.value?.trim();
        const imeiNo = document.getElementById('demo_imei_no')?.value?.trim();
        const nicNo = document.getElementById('demo_nic_sr_no')?.value?.trim();

        if (!meterNo) {
          Swal.showValidationMessage('Please enter Meter Serial No (F3)');
          return false;
        }
        if (!imeiNo) {
          Swal.showValidationMessage('Please enter IMEI No (F1)');
          return false;
        }
        if (!nicNo) {
          Swal.showValidationMessage('Please enter NIC Sr. No (F2)');
          return false;
        }
        return { meterNo: meterNo.toUpperCase(), imeiNo, nicNo: nicNo.toUpperCase() };
      }
    });

    if (!formValues) return;

    const { meterNo, imeiNo, nicNo } = formValues;

    try {
      // Demo Read Meter is for laser testing only: DO NOT SAVE TO DATABASE!
      const validRecordData = {
        serialNo: meterNo,
        imeiNo: imeiNo,
        nicSrNo: nicNo,
        recordId: null,
        isDemo: true,
        savedToDb: false,
        isIncomplete: false,
        missingFields: [],
        print: null,
        printAt: null,
        isAlreadyPrinted: false
      };

      setLastReadMeterData(validRecordData);
      laserWebSerialService.setActiveMeter(validRecordData);

      setCurrentConfig(prev => ({
        ...prev,
        recordId: null,
        serialNo: meterNo,
        imei: imeiNo,
        nicsrno: nicNo
      }));

      const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setReadMeterStatusMsg({
        text: `Demo Meter Data Loaded (${meterNo}) — Ready for Laser Print (Not saved to DB)`,
        time: timeLabel,
        type: 'SUCCESS'
      });
      setPrintLogs(prev => [
        {
          id: Date.now(),
          time: timeLabel,
          msg: `[DEMO READ] Demo meter details loaded in memory (S/N: ${meterNo}, IMEI: ${imeiNo}, NIC: ${nicNo}). Laser Machine armed for F1, F2, F3 queries. (Demo mode: NOT saved to database).`,
          status: 'SUCCESS'
        },
        ...prev
      ]);
      showSuccessAlert(
        'Demo Meter Ready',
        `Meter Serial: ${meterNo}\nIMEI No: ${imeiNo}\nNIC Sr. No: ${nicNo}\n\n(Demo Mode: This data is for laser testing and is NOT saved to the database. Click "Laser Print" to proceed.)`
      );
    } catch (err) {
      console.error('Error loading demo meter data:', err);
      showErrorAlert('Demo Meter Error', err.message || 'Could not load demo meter details.');
    }
  };

  // Create Work Order Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormId, setNewFormId] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('BATCH-2026-01');
  const [newMonthYear, setNewMonthYear] = useState('');
  const [newTargetQty, setNewTargetQty] = useState(500);
  const [newDescription, setNewDescription] = useState('Front full print');
  const [newCustomText, setNewCustomText] = useState('ZENMETER SMART METER');

  // Load Work Orders for this stage
  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await stageManagementService.getForms({ stage_number: stageId });
      const forms = Array.isArray(res) ? res : (res?.forms || res?.data || []);

      if (!forms || forms.length === 0) {
        setWorkForms([]);
        setActiveFormId(null);
        setCurrentConfig({ ...DEFAULT_PRINT_SPECS, workId: 'NO-WORK-ORDER' });
      } else {
        setWorkForms(forms);
        // Actively assigned Work ID for Stage 9 console:
        // BOTH Supervisor and Operator console displays ONLY the actively assigned Work ID for this stage!
        const assignedForStage = forms.find(f =>
          Boolean(f.assigned_operator_id) &&
          f.status !== 'DE-ACTIVE' &&
          f.status !== 'COMPLETED'
        );

        const selectedForm = assignedForStage || null;

        if (selectedForm) {
          setActiveFormId(selectedForm.form_id || selectedForm.id);
          const formConfig = selectedForm.print_config || {};
          const isDummySerial = formConfig.serialNo === 'ZG0000105' || formConfig.serialNo === 'ZG0000205' || formConfig.serialNo === 'ZG0000022';
          const isDummyImei = formConfig.imei === '865931087392880' || formConfig.imei === '865931087398129' || formConfig.imei === '865931087391616';
          setCurrentConfig({
            ...DEFAULT_PRINT_SPECS,
            ...formConfig,
            serialNo: isDummySerial ? '' : (formConfig.serialNo || ''),
            imei: isDummyImei ? '' : (formConfig.imei || ''),
            variableTexts: formConfig.variableTexts || [],
            logos: formConfig.logos || [],
            qrCodes: formConfig.qrCodes || [],
            workId: selectedForm.form_id,
            batchNo: selectedForm.batch_no || formConfig.batchNo || 'BATCH-2026-01',
            targetQty: selectedForm.target_quantity || formConfig.targetQty || 500,
            mfgDate: selectedForm.month_year || formConfig.mfgDate || ''
          });
        } else {
          setActiveFormId(null);
          setCurrentConfig({
            ...DEFAULT_PRINT_SPECS,
            workId: 'UNASSIGNED',
            variableTexts: [],
            logos: [],
            qrCodes: []
          });
        }
      }
    } catch (err) {
      console.error('Error loading work forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, [stageId, initialFormId]);

  useEffect(() => {
    let isMounted = true;
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '192.168.20.7'
    );

    // 1. Subscribe to Web Serial status updates on this laptop
    const unregisterWebSerial = webSerialService.subscribe((status) => {
      if (status.connected && isMounted) {
        const summary = formatSerialSummary(usbSerialConfig);
        setOpticalStatus({
          connected: true,
          port: status.portName,
          friendlyName: `${status.portName} (${summary})`,
          baudRate: 9600,
          ports: [{ path: status.tunnelId, friendlyName: `${status.portName} (${summary})` }],
          source: 'client_webserial',
          tunnelId: status.tunnelId,
          deviceId: status.deviceId,
          checking: false
        });
        setSelectedOpticalPort(status.tunnelId);
      } else if (!status.connected && isMounted && opticalStatusRef.current?.source === 'client_webserial' && opticalStatusRef.current?.connected && webSerialService.port) {
        handleHardwareDisconnection('Web Serial connection closed.');
      }
    });

    // 1b. Subscribe to Laser Web Serial status and telemetry logs
    const unregisterLaserLog = laserWebSerialService.onLog((entry) => {
      if (isMounted) setPrintLogs(prev => [entry, ...prev]);
    });
    const unregisterLaserStatus = laserWebSerialService.subscribe((status) => {
      if (status.connected && isMounted) {
        const summary = formatSerialSummary(laserSerialConfig);
        setLaserStatus({
          connected: true,
          port: status.portName,
          friendlyName: `${status.portName} (${summary})`,
          baudRate: 9600,
          source: 'client_webserial',
          ports: availableLaserPorts,
          checking: false
        });
      }
    });

    // 2. Hardware plug / unplug event listeners on this laptop
    const removeListeners = webSerialService.setupDeviceListeners(
      async () => {
        // USB device plugged into this laptop: update port list
        const list = await refreshPairedPorts();
        if (list && list.length > 0 && isMounted) {
          if (!selectedPortId || selectedPortId === '__pair_new__') {
            setSelectedPortId('paired_0');
          }
          setPrintLogs(prev => [
            {
              id: Date.now(),
              time: new Date().toLocaleTimeString(),
              msg: `[HARDWARE] USB Port detected: ${list[0].friendlyName}.`,
              status: 'INFO'
            },
            ...prev
          ]);
          // Manual connect only: user chooses port and clicks Connect
        }
      },
      async () => {
        // ONLY disconnect Optical Port if optical port itself is physically gone!
        if (isMounted && opticalStatusRef.current?.connected && opticalStatusRef.current?.source === 'client_webserial') {
          const still = await webSerialService.checkPortStillConnected();
          if (!still) {
            handleHardwareDisconnection('USB cable physically unplugged from laptop.', false);
          }
        }
      }
    );

    // 2b. Hardware plug / unplug event listeners for Laser Port on this laptop
    const removeLaserListeners = laserWebSerialService.setupDeviceListeners(
      async () => {
        const list = await refreshPairedLaserPorts();
        if (list && list.length > 0 && isMounted) {
          setPrintLogs(prev => [
            {
              id: Date.now(),
              time: new Date().toLocaleTimeString(),
              msg: `[HARDWARE] Laser device detected: ${list[0].friendlyName}.`,
              status: 'INFO'
            },
            ...prev
          ]);
        }
      },
      async () => {
        // ONLY disconnect Laser Port if laser port itself is physically gone!
        if (isMounted && laserStatusRef.current?.connected && laserStatusRef.current?.source === 'client_webserial') {
          const still = await laserWebSerialService.checkPortStillConnected();
          if (!still) {
            handleHardwareLaserDisconnection('Laser Port USB cable physically unplugged from laptop.');
          }
        }
      }
    );

    // 3. Scan available ports on mount (Preserve connections across reload unless manually disconnected)
    const initSerial = async () => {
      // Check paired Web Serial ports on this laptop (filtering out any dummy ports)
      const pairedList = await refreshPairedPorts();
      const pairedLaserList = await refreshPairedLaserPorts();

      // Check if USB Port was connected before reload and not manually disconnected
      let wasOpticalConnected = false;
      let opticalManualDisconnect = false;
      let lastOpticalPort = null;
      let lastOpticalSource = 'client_webserial';
      try {
        wasOpticalConnected = localStorage.getItem('zenmeter_optical_was_connected') === 'true';
        opticalManualDisconnect = localStorage.getItem('zenmeter_optical_manual_disconnect') === 'true';
        lastOpticalPort = localStorage.getItem('zenmeter_optical_last_port');
        lastOpticalSource = localStorage.getItem('zenmeter_optical_source') || 'client_webserial';
        if (lastOpticalPort && isDummyPortName(lastOpticalPort)) {
          lastOpticalPort = null;
        }
      } catch (_) { }

      // Query server status
      let detectedServerPorts = [];
      let isServer = isServerMachine;
      try {
        const res = await stage09Service.getOpticalStatus();
        if (res?.isServerMachine !== undefined) {
          isServer = res.isServerMachine;
          if (isMounted) setIsServerMachine(res.isServerMachine);
        }

        detectedServerPorts = (res && Array.isArray(res.ports))
          ? res.ports.filter(p => !isDummyPortName(p.friendlyName || p.path))
          : [];
        if (isMounted && detectedServerPorts.length > 0) {
          setAvailableOpticalPorts(detectedServerPorts);
        }
      } catch (e) {
        console.warn('[Serial] Port scan error on mount:', e.message);
      }

      // Reconnect Optical Port if not manually disconnected
      const targetOptKey = lastOpticalPort ? extractPortKey(lastOpticalPort).toLowerCase() : '';
      const optIsPhysicallyPresent = Boolean(targetOptKey && detectedServerPorts.some(p => extractPortKey(p.path).toLowerCase() === targetOptKey || extractPortKey(p.friendlyName || '').toLowerCase() === targetOptKey));
      const shouldConnectOptical = !opticalManualDisconnect && (wasOpticalConnected || Boolean(lastOpticalPort) || (pairedList && pairedList.length > 0));
      if (shouldConnectOptical && isMounted) {
        if (!isServer || lastOpticalSource === 'client_webserial' || (!lastOpticalPort && pairedList && pairedList.length > 0)) {
          if (pairedList && pairedList.length > 0) {
            try {
              const matchingPort = (lastOpticalPort && pairedList.find(p => p.friendlyName === lastOpticalPort)) || pairedList[0];
              const eff = getEffectiveSerialConfig(usbSerialConfig);
              await webSerialService.connectPort(matchingPort.port, currentOperatorId, eff);
            } catch (webErr) {
              console.warn('[WebSerial] Reconnection error on reload:', webErr);
              if (isMounted) setOpticalStatus(prev => ({ ...prev, checking: false }));
            }
          } else if (isMounted) {
            setOpticalStatus(prev => ({ ...prev, checking: false }));
          }
        } else if (lastOpticalPort && isMounted && isServer) {
          if (optIsPhysicallyPresent && detectedServerPorts.length > 0) {
            await handleConnectServerPort(lastOpticalPort, true);
          } else {
            setOpticalStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
            try { localStorage.setItem('zenmeter_optical_was_connected', 'false'); } catch (_) { }
          }
        }
      } else if (isMounted) {
        if (isServer) {
          setOpticalStatus(prev => ({
            ...prev,
            connected: false,
            ports: detectedServerPorts,
            checking: false
          }));

          if (detectedServerPorts.length > 0) {
            let savedPort = lastOpticalPort && !isDummyPortName(lastOpticalPort) ? lastOpticalPort : null;
            const matchedPort = savedPort && detectedServerPorts.find(p => p.path && p.path.toLowerCase() === savedPort.toLowerCase());
            const targetPort = matchedPort ? matchedPort.path : detectedServerPorts[0].path;
            if (targetPort) {
              setSelectedPortId(`server_${targetPort}`);
              setSelectedOpticalPort(targetPort);
            }
          }
        } else {
          setOpticalStatus(prev => ({
            ...prev,
            connected: false,
            ports: pairedList,
            checking: false
          }));
          if (pairedList && pairedList.length > 0) {
            setSelectedPortId('paired_0');
            setSelectedOpticalPort(pairedList[0].friendlyName);
          } else {
            setSelectedPortId('__pair_new__');
            setSelectedOpticalPort('');
          }
        }
      }

      // Check if Laser Port was connected before reload and not manually disconnected
      let wasLaserConnected = false;
      let laserManualDisconnect = false;
      let lastLaserPort = null;
      let lastLaserSource = 'server';
      try {
        wasLaserConnected = localStorage.getItem('zenmeter_laser_was_connected') === 'true';
        laserManualDisconnect = localStorage.getItem('zenmeter_laser_manual_disconnect') === 'true';
        lastLaserPort = localStorage.getItem('zenmeter_laser_last_port');
        lastLaserSource = localStorage.getItem('zenmeter_laser_source') || 'server';
        if (lastLaserPort && isDummyPortName(lastLaserPort)) {
          lastLaserPort = null;
        }
      } catch (_) { }

      try {
        const laserStatusRes = await stage09Service.getLaserStatus({
          deviceId: webSerialService.deviceId,
          tunnelId: opticalStatusRef.current?.tunnelId || ''
        });

        if (laserStatusRes?.isServerMachine !== undefined) {
          isServer = laserStatusRes.isServerMachine;
          if (isMounted) setIsServerMachine(laserStatusRes.isServerMachine);
        }

        const detLaserPorts = (laserStatusRes && Array.isArray(laserStatusRes.ports))
          ? laserStatusRes.ports.filter(p => !isDummyPortName(p.friendlyName || p.path))
          : [];

        if (isServer) {
          if (isMounted) {
            setAvailableLaserPorts(detLaserPorts);
          }

          // Prevent port conflict on reload: if both USB and Laser were saved with the same COM port
          if (lastOpticalPort && lastLaserPort && extractPortKey(lastLaserPort) === extractPortKey(lastOpticalPort)) {
            const altPort = detLaserPorts.find(p => extractPortKey(p.path) !== extractPortKey(lastOpticalPort));
            if (altPort) {
              lastLaserPort = altPort.path;
              try { localStorage.setItem('zenmeter_laser_last_port', altPort.path); } catch (_) { }
            } else {
              wasLaserConnected = false;
              lastLaserPort = null;
            }
          }

          const isBackendLaserOpen = Boolean(laserStatusRes && laserStatusRes.connected);
          const rawPort = lastLaserPort || laserStatusRes?.port || (detLaserPorts.length > 0 ? detLaserPorts[0].path : '');
          const targetLaserPort = rawPort ? (extractPortKey(rawPort) || rawPort) : '';
          const targetLaserKey = targetLaserPort ? extractPortKey(targetLaserPort).toLowerCase() : '';
          const portIsPhysicallyPresent = Boolean(targetLaserKey && detLaserPorts.some(p => extractPortKey(p.path).toLowerCase() === targetLaserKey || extractPortKey(p.friendlyName || '').toLowerCase() === targetLaserKey));
          const shouldConnectLaser = !laserManualDisconnect && portIsPhysicallyPresent && detLaserPorts.length > 0 && (wasLaserConnected || isBackendLaserOpen);

          if (shouldConnectLaser && isMounted) {
            if (isBackendLaserOpen) {
              const summary = formatSerialSummary(laserSerialConfig);
              const activePort = laserStatusRes.port ? (extractPortKey(laserStatusRes.port) || laserStatusRes.port) : targetLaserPort;
              setLaserStatus({
                connected: true,
                port: activePort,
                friendlyName: `Laser COM (${activePort}) (${summary})`,
                baudRate: 9600,
                source: 'server',
                ports: detLaserPorts,
                checking: false
              });
              setSelectedLaserPort(activePort);
              setSelectedLaserPortId(`laser_server_${activePort}`);
              try {
                localStorage.setItem('zenmeter_laser_was_connected', 'true');
                localStorage.setItem('zenmeter_laser_last_port', activePort);
                localStorage.setItem('zenmeter_laser_source', 'server');
                localStorage.setItem('zenmeter_laser_manual_disconnect', 'false');
              } catch (_) { }
            } else {
              const cleanTarget = extractPortKey(targetLaserPort) || targetLaserPort;
              const eff = getEffectiveSerialConfig(laserSerialConfig);
              const lRes = await stage09Service.connectLaserPort({
                port: cleanTarget,
                baudRate: eff.baudRate,
                dataBits: eff.dataBits,
                parity: eff.parity,
                stopBits: eff.stopBits,
                parityErrorChar: eff.parityErrorChar,
                deviceId: webSerialService.deviceId,
                tunnelId: opticalStatusRef.current?.tunnelId || ''
              });
              if (lRes && (lRes.success || lRes.connected) && isMounted) {
                const summary = formatSerialSummary(laserSerialConfig);
                const connectedPort = lRes.port ? (extractPortKey(lRes.port) || lRes.port) : cleanTarget;
                setLaserStatus(prev => ({
                  ...prev,
                  connected: true,
                  port: connectedPort,
                  friendlyName: `Laser COM (${connectedPort}) (${summary})`,
                  checking: false
                }));
                setSelectedLaserPort(connectedPort);
                setSelectedLaserPortId(`laser_server_${connectedPort}`);
                try {
                  localStorage.setItem('zenmeter_laser_was_connected', 'true');
                  localStorage.setItem('zenmeter_laser_last_port', connectedPort);
                  localStorage.setItem('zenmeter_laser_source', 'server');
                  localStorage.setItem('zenmeter_laser_manual_disconnect', 'false');
                } catch (_) { }
              } else if (isMounted) {
                setLaserStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
                try { localStorage.setItem('zenmeter_laser_was_connected', 'false'); } catch (_) { }
              }
            }
          } else if (isMounted) {
            setLaserStatus(prev => ({ ...prev, connected: false, port: null, friendlyName: null, checking: false }));
            try { localStorage.setItem('zenmeter_laser_was_connected', 'false'); } catch (_) { }
          }
        } else if (isMounted) {
          // Remote laptop: hide server ports!
          setAvailableLaserPorts([]);
          setLaserStatus(prev => ({
            ...prev,
            connected: false,
            ports: pairedLaserList,
            checking: false
          }));

          if (pairedLaserList && pairedLaserList.length > 0) {
            const freeLaser = pairedLaserList.find(p => !p.isUsedByOptical && (!webSerialService?.port || webSerialService.port !== p.port));
            if (freeLaser) {
              const freeIdx = pairedLaserList.indexOf(freeLaser);
              setSelectedLaserPortId(`laser_paired_${freeIdx}`);
              setSelectedLaserPort(freeLaser.friendlyName);

              if (!laserManualDisconnect && (wasLaserConnected || lastLaserSource === 'client_webserial')) {
                try {
                  const eff = getEffectiveSerialConfig(laserSerialConfig);
                  const res = await laserWebSerialService.connectPort(freeLaser.port, eff);
                  if (res && res.success && isMounted) {
                    const summary = formatSerialSummary(laserSerialConfig);
                    setLaserStatus({
                      connected: true,
                      port: res.portName,
                      friendlyName: `${res.portName} (${summary})`,
                      baudRate: eff.baudRate,
                      source: 'client_webserial',
                      ports: pairedLaserList,
                      checking: false
                    });
                    setSelectedLaserPort(res.portName);
                  }
                } catch (webErr) {
                  console.warn('[LaserWebSerial] Reconnection error on reload:', webErr);
                }
              }
            } else {
              setSelectedLaserPortId('__laser_pair_new__');
              setSelectedLaserPort('');
            }
          } else {
            setSelectedLaserPortId('__laser_pair_new__');
            setSelectedLaserPort('');
          }
        }
      } catch (e) {
        console.warn('[Serial] Laser port scan error on mount:', e.message);
      }
    };

    initSerial();

    // 4. Continuous hardware connection monitoring
    // Checks every 1200ms:
    // a) If connected via WebSerial, verifies whether the physical port is still present in navigator.serial.getPorts().
    // b) If connected via Server COM port, queries stage09Service.getOpticalStatus to ensure the COM port is still physically present in the system. If unplugged, immediately disconnects!
    // c) Keeps dropdown port list fresh without auto-connecting.
    const timer = setInterval(async () => {
      if (!isMounted) return;
      const currentStatus = opticalStatusRef.current;

      // Case A: WebSerial connected -> verify device is still physically present in browser
      if (currentStatus.connected && currentStatus.source === 'client_webserial' && webSerialService.port) {
        const isStillConnected = await webSerialService.checkPortStillConnected();
        if (!isStillConnected) {
          await handleHardwareDisconnection('Physical USB cable unplugged from laptop.', false);
        }
      }

      // Case B: Server COM port monitoring (reflects Windows Device Manager in real-time)
      try {
        const res = await stage09Service.getOpticalStatus({ allow_server_port: 'true' });
        if (!isMounted) return;
        const currentPorts = (res && Array.isArray(res.ports)) ? res.ports : [];
        setAvailableOpticalPorts(currentPorts);

        // If connected via server COM port, check if that COM port is still physically present
        if (currentStatus.connected && currentStatus.source === 'server') {
          const connectedPath = (currentStatus.port || selectedOpticalPortRef.current || '').toLowerCase();
          const cleanKey = extractPortKey(connectedPath).toLowerCase();
          const stillPresent = currentPorts.some(p => {
            const pPath = (p.path || '').toLowerCase();
            const pKey = extractPortKey(pPath).toLowerCase();
            const fKey = extractPortKey(p.friendlyName || '').toLowerCase();
            return pPath === connectedPath || (cleanKey && (pKey === cleanKey || fKey === cleanKey));
          });
          if (!stillPresent && currentPorts.length > 0) {
            await handleHardwareDisconnection(`Optical Port (${currentStatus.port || 'COM Port'}) physically unplugged from system.`, false);
          }
        }

        // Case C: Update available ports list if changed
        setOpticalStatus(prev => {
          const prevPaths = (prev.ports || []).map(p => p.path).join(',');
          const newPaths = currentPorts.map(p => p.path).join(',');
          if (prevPaths !== newPaths) {
            return { ...prev, ports: currentPorts };
          }
          return prev;
        });

        // Case D: Auto-select detected port in dropdown if empty (manual connect only)
        if (!currentStatus.connected && currentPorts.length > 0) {
          setSelectedPortId(prev => {
            if (!prev || (prev.startsWith('server_') && !currentPorts.some(p => `server_${p.path}` === prev))) {
              return `server_${currentPorts[0].path}`;
            }
            return prev;
          });
        }
      } catch (_) { }

      // Laser Port hardware monitoring: continuously check if physically unplugged or disconnected
      try {
        const currentLaser = laserStatusRef.current;

        // Case A: Client laptop Web Serial connected
        if (currentLaser.connected && currentLaser.source === 'client_webserial' && laserWebSerialService.port) {
          const isStillConnected = await laserWebSerialService.checkPortStillConnected();
          if (!isStillConnected) {
            await handleHardwareLaserDisconnection('Physical Laser Port USB cable unplugged from laptop.');
          }
        }

        // Case B: Server COM port hardware monitoring (ONLY when connected on Server PC)
        if (isServerMachine || currentLaser.source === 'server') {
          const lRes = await stage09Service.getLaserStatus({
            deviceId: webSerialService.deviceId,
            tunnelId: opticalStatusRef.current?.tunnelId || ''
          });
          if (isMounted) {
            const detLaser = (lRes && Array.isArray(lRes.ports)) ? lRes.ports : [];
            setAvailableLaserPorts(detLaser);

            if (currentLaser.connected && currentLaser.source === 'server') {
              const connectedLaserPath = (currentLaser.port || '').toLowerCase();
              const cleanLaserKey = extractPortKey(connectedLaserPath).toLowerCase();
              const laserStillPresent = detLaser.some(p => {
                const pPath = (p.path || '').toLowerCase();
                const pKey = extractPortKey(pPath).toLowerCase();
                const fKey = extractPortKey(p.friendlyName || '').toLowerCase();
                return pPath === connectedLaserPath || (cleanLaserKey && (pKey === cleanLaserKey || fKey === cleanLaserKey));
              });
              if (!laserStillPresent && detLaser.length > 0) {
                // Laser cable physically unplugged from system
                await handleHardwareLaserDisconnection(`Laser Port (${currentLaser.port || 'COM Port'}) physically unplugged from system.`);
              }
            } else if (currentLaser.checking) {
              setLaserStatus(prev => ({ ...prev, checking: false }));
            }

            if (!currentLaser.connected && detLaser.length > 0) {
              setSelectedLaserPortId(prev => {
                if (!prev || (prev.startsWith('laser_server_') && !detLaser.some(p => `laser_server_${p.path}` === prev))) {
                  return `laser_server_${detLaser[0].path}`;
                }
                return prev;
              });
            }
          }
        }
      } catch (_) { }
    }, 1200);

    return () => {
      isMounted = false;
      unregisterWebSerial();
      unregisterLaserLog();
      unregisterLaserStatus();
      removeListeners();
      removeLaserListeners();
      clearInterval(timer);
    };
  }, [currentOperatorId]);

  useEffect(() => {
    setRecordsPage(1);
    if (!activeFormId || activeFormId === 'UNASSIGNED') {
      setOperatorCompletedCount(0);
      setBatchCompletedCount(0);
      setDbTargetQuantity(null);
      return;
    }
    loadSavedRecords(activeFormId);
    const refreshSilently = () => loadSavedRecords(activeFormId, true);
    const pollTimer = setInterval(refreshSilently, 8000);
    window.addEventListener('focus', refreshSilently);
    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', refreshSilently);
    };
  }, [activeFormId, currentOperatorId, isOperator, isSupervisor, isQC]);

  // Handle switching active Work ID
  const handleSelectWorkId = (formId) => {
    const selected = workForms.find(f => String(f.form_id) === String(formId) || String(f.id) === String(formId));
    if (!selected) return;

    setActiveFormId(selected.form_id || selected.id);
    setReadMeterStatusMsg(null);
    setLastReadMeterData(null);
    const cfg = selected.print_config || DEFAULT_PRINT_SPECS;
    const isDummySerial = cfg.serialNo === 'ZG0000105' || cfg.serialNo === 'ZG0000205' || cfg.serialNo === 'ZG0000022';
    const isDummyImei = cfg.imei === '865931087392880' || cfg.imei === '865931087398129' || cfg.imei === '865931087391616';
    setCurrentConfig({
      ...DEFAULT_PRINT_SPECS,
      ...cfg,
      serialNo: isDummySerial ? '' : (cfg.serialNo || ''),
      imei: isDummyImei ? '' : (cfg.imei || ''),
      workId: selected.form_id,
      batchNo: selected.batch_no || cfg.batchNo || 'BATCH-2026-01',
      targetQty: selected.target_quantity || cfg.targetQty || 500,
      mfgDate: selected.month_year || cfg.mfgDate || ''
    });
  };

  // Update a single parameter field in current config
  const handleParamChange = (field, value) => {
    if (!canManageWorkId) return; // Read-only for operators
    setCurrentConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save changes to current Work ID
  const handleSaveWorkId = async () => {
    const activeForm = workForms.find(f => String(f.form_id) === String(activeFormId) || String(f.id) === String(activeFormId));
    if (!activeForm) return;

    setSaving(true);
    try {
      const targetId = activeForm.id || activeForm.form_id;
      await stageManagementService.updateForm(targetId, {
        batch_no: activeForm.batch_no,
        target_quantity: activeForm.target_quantity,
        completed_quantity: activeForm.completed_quantity,
        description: activeForm.description,
        print_config: currentConfig
      });

      // Update in local state
      setWorkForms(prev => prev.map(f => {
        if (f.id === targetId || f.form_id === targetId) {
          return { ...f, print_config: currentConfig };
        }
        return f;
      }));

      showSuccessAlert(
        'Work ID Updated',
        `Parameters for '${activeForm.form_id}' (Work ID) updated & persisted to PostgreSQL database successfully!`
      );
    } catch (err) {
      console.error('Save error:', err);
      // Fallback local update
      setWorkForms(prev => prev.map(f => {
        if (f.form_id === activeForm.form_id) {
          return { ...f, print_config: currentConfig };
        }
        return f;
      }));
      showSuccessAlert(
        'Work ID Saved',
        `Parameters for '${activeForm.form_id}' updated successfully in local memory!`
      );
    } finally {
      setSaving(false);
    }
  };

  // Start Laser Print Session:
  // When user clicks "Laser Print", do NOT send data immediately.
  // Wait on Laser Machine serial port for F1, F2, F3 queries.
  // The "Laser Print" button hides, and "Stop Laser" button is shown.
  const handleStartLaserPrint = async () => {
    if (isLaserActive || isPrinting) return;

    if (!laserStatus.connected) {
      showErrorAlert('Laser COM Port Required', 'Laser Machine serial COM port is disconnected. Please connect the Laser COM port first.');
      return;
    }

    if (!opticalStatus.connected && !lastReadMeterData?.isDemo && !lastReadMeterData?.savedToDb) {
      showErrorAlert('Optical Cable Required', 'Optical cable is disconnected. Please connect the USB Optical Cable or use Demo Read Meter to execute Laser Print.');
      return;
    }

    if (!activeWorkForm?.assigned_operator_id && !isSupervisor && !isQC && !isAdmin) {
      showErrorAlert('Operator Assignment Required', 'Cannot proceed. Please assign an operator to this stage in Stage Management first.');
      return;
    }

    if (isMeterAlreadyPrinted) {
      showErrorAlert('Meter Already Printed', 'This meter has already been laser printed. Duplicate printing is prohibited.');
      return;
    }

    if (missingMeterFields.length > 0) {
      showErrorAlert('Missing Meter Details', `Cannot print: ${missingMeterFields.join(', ')} is missing. Please re-update meter details before laser printing.`);
      return;
    }

    if (!hasValidMeterData || !lastReadMeterData || !lastReadMeterData.serialNo) {
      showErrorAlert('Meter Reading Required', 'Please read a meter using the "Read Meter" button first before executing Laser Print.');
      return;
    }

    const targetLimitError = checkOperatorTargetLimitReached();
    if (targetLimitError) {
      setPrintLogs(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), msg: `BLOCKED: ${targetLimitError}`, status: 'ERROR' },
        ...prev
      ]);
      showErrorAlert('Batch Target Reached', targetLimitError);
      return;
    }

    const targetSerial = String(lastReadMeterData.serialNo).trim();
    const targetLaserPort = selectedLaserPort || laserStatus.port || null;
    const nowTime = new Date().toLocaleTimeString();

    setIsLaserActive(true);
    setLaserQueryStatus({ f1: false, f2: false, f3: false });

    setPrintLogs(prev => [
      {
        id: Date.now(),
        time: nowTime,
        msg: `[LASER ARMED] Laser Port (${targetLaserPort || 'COM'}) listening for F1, F2, F3. Waiting for Laser trigger...`,
        status: 'INFO'
      },
      ...prev
    ]);

    try {
      if (laserStatus.source === 'client_webserial') {
        laserWebSerialService.startLaserSession({
          serialNo: targetSerial,
          imeiNo: lastReadMeterData.imeiNo || currentConfig.imei || null,
          nicSrNo: lastReadMeterData.nicSrNo || currentConfig.nicsrno || null
        });
      } else {
        await stage09Service.startLaserSession({
          meter_serial_no: targetSerial,
          imei_no: lastReadMeterData.imeiNo || currentConfig.imei || null,
          nic_sr_no: lastReadMeterData.nicSrNo || currentConfig.nicsrno || null,
          port: targetLaserPort
        });

        // Poll backend session status while laser is active to track F1, F2, F3 queries in real-time
        if (laserPollTimerRef.current) clearInterval(laserPollTimerRef.current);
        laserPollTimerRef.current = setInterval(async () => {
          try {
            const statusRes = await stage09Service.getLaserSessionStatus();
            if (statusRes && statusRes.success) {
              if (statusRes.sent) {
                setLaserQueryStatus(statusRes.sent);
              }
              if (Array.isArray(statusRes.logs) && statusRes.logs.length > 0) {
                setPrintLogs(prev => {
                  const existingIds = new Set(prev.map(l => l.msg));
                  const newLogs = statusRes.logs.filter(l => !existingIds.has(l.msg));
                  return newLogs.length > 0 ? [...newLogs, ...prev] : prev;
                });
              }
            }
          } catch (_) { }
        }, 500);
      }
    } catch (err) {
      console.error('Error starting laser session:', err);
      setIsLaserActive(false);
      if (laserPollTimerRef.current) {
        clearInterval(laserPollTimerRef.current);
        laserPollTimerRef.current = null;
      }
      showErrorAlert('Laser Start Failed', err.message || 'Could not arm laser communication.');
    }
  };

  // Stop Laser Print Session:
  // When operator clicks "Stop Laser", stop serial communication (no more responding to F1/F2/F3).
  // If data was queried and transmitted, persist print in PostgreSQL DB and refresh records.
  const handleStopLaserPrint = async () => {
    if (laserPollTimerRef.current) {
      clearInterval(laserPollTimerRef.current);
      laserPollTimerRef.current = null;
    }

    setIsPrinting(true);
    let sessionSent = { ...laserQueryStatus };
    const nowTime = new Date().toLocaleTimeString();

    try {
      if (laserStatus.source === 'client_webserial') {
        const stopRes = laserWebSerialService.stopLaserSession();
        if (stopRes?.sent) {
          sessionSent = { ...sessionSent, ...stopRes.sent };
        }
      } else {
        const stopRes = await stage09Service.stopLaserSession();
        if (stopRes?.sent) {
          sessionSent = { ...sessionSent, ...stopRes.sent };
        }
        if (Array.isArray(stopRes?.logs) && stopRes.logs.length > 0) {
          setPrintLogs(prev => [...stopRes.logs, ...prev]);
        }
      }

      setIsLaserActive(false);

      const anyDataTransmitted = sessionSent.f1 || sessionSent.f2 || sessionSent.f3;
      const targetSerial = String(lastReadMeterData?.serialNo || currentConfig.serialNo || '').trim();
      const activeForm = workForms.find(f => String(f.form_id) === String(activeFormId) || String(f.id) === String(activeFormId));
      const targetRecordId = lastReadMeterData?.recordId || currentConfig.recordId || null;
      const targetLaserPort = selectedLaserPort || laserStatus.port || null;
      const dynamicStageId = activeForm?.stage_number || stageId || null;
      const effectiveTunnelId = opticalStatus.source === 'client_webserial' ? (opticalStatus.tunnelId || webSerialService.tunnelId) : null;
      const effectiveDeviceId = webSerialService.deviceId;

      setPrintLogs(prev => [
        {
          id: Date.now(),
          time: nowTime,
          msg: `[LASER STOPPED] Serial communication stopped by operator. F3(Serial): ${sessionSent.f3 ? 'SENT' : 'NO'}, F2(NIC): ${sessionSent.f2 ? 'SENT' : 'NO'}, F1(IMEI): ${sessionSent.f1 ? 'SENT' : 'NO'}.`,
          status: 'INFO'
        },
        ...prev
      ]);

      if (targetSerial) {
        if (lastReadMeterData?.isDemo) {
          // DEMO PRINT: DO NOT SAVE TO DATABASE!
          setPrintLogs(prev => [
            {
              id: Date.now(),
              time: nowTime,
              msg: `[DEMO COMPLETE] Demo meter (S/N: ${targetSerial}) laser marking test completed. Demo data was NOT saved to database.`,
              status: 'SUCCESS'
            },
            ...prev
          ]);

          showSuccessAlert(
            'Demo Laser Test Complete',
            'Laser communication stopped.\n\n(Demo Mode: Serial communication stopped. Demo data was NOT saved to the database.)'
          );
        } else {
          // REAL METER: Update print status in PostgreSQL DB and increment completed quantity
          const res = await stage09Service.printMeter({
            id: targetRecordId,
            work_id: activeForm?.form_id || activeFormId,
            stage_id: dynamicStageId,
            meter_serial_no: targetSerial,
            imei_no: lastReadMeterData?.imeiNo || currentConfig.imei || null,
            nic_sr_no: lastReadMeterData?.nicSrNo || currentConfig.nicsrno || null,
            port: targetLaserPort,
            laser_port: targetLaserPort,
            laser_source: laserStatus.source || 'server',
            client_webserial: laserStatus.source === 'client_webserial',
            already_transmitted: true,
            alreadyTransmitted: true,
            operator_id: currentOperatorId || 'OPERATOR',
            operator_name: currentUser?.name || currentUser?.user_name || null,
            user_role: currentUser?.role || null,
            tunnel_id: effectiveTunnelId,
            device_id: effectiveDeviceId
          });

          if (res && res.success) {
            const updatedRecord = res.record || {};
            const printedTimeStr = updatedRecord.print_at
              ? new Date(updatedRecord.print_at).toLocaleString()
              : new Date().toLocaleString();

            if (Array.isArray(res.logs) && res.logs.length > 0) {
              setPrintLogs(prev => [...res.logs, ...prev]);
            }

            if (activeForm) {
              syncProgressFromResponse(res);
              const newCompleted = res.printedCount !== undefined
                ? Math.max((activeForm.completed_quantity || 0) + 1, res.printedCount)
                : (typeof res.batch_completed_count === 'number' ? res.batch_completed_count : ((activeForm.completed_quantity || 0) + 1));
              activeForm.completed_quantity = newCompleted;
              setWorkForms([...workForms]);
              stageManagementService.updateForm(activeForm.id || activeForm.form_id, {
                completed_quantity: newCompleted
              }).catch(() => { });
            }

            await loadSavedRecords(activeForm?.form_id || activeFormId);

            showSuccessAlert(
              'Laser Print Completed',
              `Print Status: ${updatedRecord.print || 'printed'}\nPrint At: ${printedTimeStr}`
            );
          } else {
            showErrorAlert('Laser Print Update Failed', res?.message || 'Could not update print record.');
          }
        }
      } else {
        showSuccessAlert(
          'Laser Stopped',
          'Laser communication stopped.'
        );
      }
    } catch (err) {
      console.error('Error stopping laser print:', err);
      showErrorAlert('Stop Laser Error', err.message || 'Error stopping laser communication.');
    } finally {
      setIsPrinting(false);
      setIsLaserActive(false);
      // ALWAYS clear Serial No, IMEI No, and NIC Sr. No when stop laser is clicked or print is finished
      setCurrentConfig(prev => ({
        ...prev,
        recordId: null,
        serialNo: '',
        imei: '',
        deviceNo: '',
        nicsrno: ''
      }));
      setLastReadMeterData(null);
      laserWebSerialService.setActiveMeter(null);
      setReadMeterStatusMsg(null);
      setLaserQueryStatus({ f1: false, f2: false, f3: false });
    }
  };

  // Open Create Work ID Modal
  const handleOpenCreateModal = () => {
    let maxIdx = 0;
    workForms.forEach((f) => {
      const match = (f.form_id || '').match(/WORK-STG9-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxIdx) maxIdx = num;
      }
    });
    if (maxIdx === 0) maxIdx = workForms.length;
    let nextIdx = maxIdx + 1;
    let candidateId = `WORK-STG9-${String(nextIdx).padStart(3, '0')}`;
    while (workForms.some((f) => (f.form_id || '').trim().toLowerCase() === candidateId.toLowerCase())) {
      nextIdx++;
      candidateId = `WORK-STG9-${String(nextIdx).padStart(3, '0')}`;
    }

    setNewFormId(candidateId);
    setNewFormTitle(`Custom Meter Body Print Work Order ${nextIdx}`);
    setNewBatchNo(`BATCH-2026-${String(nextIdx).padStart(2, '0')}`);
    setNewMonthYear('');
    setNewTargetQty(500);
    setNewDescription('Front full laser print with customized parameter mapping.');
    setNewCustomText('ZENMETER SMART METER');
    setIsCreateModalOpen(true);
  };

  // Create new Work ID
  const handleCreateNewForm = async (e) => {
    e.preventDefault();
    const trimmedId = newFormId.trim();
    if (!trimmedId) {
      showErrorAlert('Validation Error', 'Work ID is required.');
      return;
    }

    // Client-side Duplicate Check
    const isDuplicate = workForms.some(
      (f) => (f.form_id || '').trim().toLowerCase() === trimmedId.toLowerCase()
    );
    if (isDuplicate) {
      showErrorAlert(
        'Duplicate Work ID',
        `Work ID '${trimmedId}' already exists. Please choose a unique Work ID.`
      );
      return;
    }

    try {
      const newConfig = {
        ...DEFAULT_PRINT_SPECS,
        customLogoText: newCustomText || 'ZENMETER SMART METER',
        mfgDate: newMonthYear.trim() || '',
        variableTexts: [
          {
            id: 'vt-1',
            text: newCustomText || 'ZENMETER SMART METER',
            x: 95,
            y: 42,
            leftPercent: 22.6,
            topPercent: 9.3,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#0f172a'
          }
        ],
        serialNo: `${String(workForms.length * 100 + 1).padStart(3, '0')}`,
        imei: `${String(Date.now()).slice(-4)}`
      };

      const res = await stageManagementService.createForm({
        form_id: trimmedId,
        stage_number: stageId,
        stage_name: stageTitle,
        form_title: newFormTitle.trim(),
        batch_no: newBatchNo.trim(),
        month_year: newMonthYear.trim() || '',
        target_quantity: Number(newTargetQty),
        completed_quantity: 0,
        description: newDescription,
        print_config: newConfig,
        created_by: currentUserName,
        updated_by: currentUserName
      });

      const created = res.form || res.data || {
        id: Date.now(),
        form_id: trimmedId,
        stage_number: stageId,
        form_title: newFormTitle.trim(),
        batch_no: newBatchNo.trim(),
        month_year: newMonthYear.trim() || '',
        target_quantity: Number(newTargetQty),
        completed_quantity: 0,
        description: newDescription,
        print_config: newConfig,
        created_by: currentUserName,
        updated_by: currentUserName
      };

      setWorkForms((prev) => [created, ...prev]);
      setActiveFormId(created.form_id);
      setCurrentConfig({ ...newConfig, workId: created.form_id });
      setIsCreateModalOpen(false);

      showSuccessAlert(
        'Work ID Created',
        `New Work Order '${created.form_id}' created successfully for ${stageTitle}!`
      );
    } catch (err) {
      showErrorAlert('Creation Failed', err.message || 'Could not create Work Order');
    }
  };

  // Print High-Res Printable Label Dialog
  const handlePrintLabel = () => {
    window.print();
  };

  // Date formatting helper: dd/mm/yyyy hh:mm AM/PM
  const formatDateTimeDDMMYYYY = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const normalizedStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) return String(dateStr);

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');

      return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
    } catch (e) {
      return String(dateStr);
    }
  };

  const printedRecordsCount = useMemo(() => {
    return (savedMeterRecords || []).filter(r => r.print === 'printed' || r.print === 'PRINTED').length;
  }, [savedMeterRecords]);

  // Actively assigned form object for Stage 9
  const activeWorkForm = workForms.find(f => Boolean(f.assigned_operator_id) && f.status !== 'DE-ACTIVE' && f.status !== 'COMPLETED') || null;
  const targetQuantity = dbTargetQuantity || Number(activeWorkForm?.target_quantity) || 500;
  const displayedCompletedCount = typeof batchCompletedCount === 'number'
    ? batchCompletedCount
    : printedRecordsCount;
  const progressPercentage = Math.round((displayedCompletedCount / targetQuantity) * 100);
  const progressBarWidth = Math.min(100, progressPercentage);

  return (
    <div className="container-fluid px-0 pb-4 font-sans">
      {/* Top Header Bar */}
      {/* <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-3 p-md-3.5 rounded-3 shadow-sm border">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="ti ti-printer text-primary"></i>
                <span>Meter Box Body Laser Print Console</span>
              </h1>
              <span className="badge text-white font-mono px-2.5 py-1 fs-6 shadow-2xs" style={{ backgroundColor: '#ff5c00' }}>
                Stage {stageId}
              </span>
            </div>
          </div>
        </div>
      </div> */}

      {/* Work ID Switcher Ribbon */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-body py-2.5 px-3.5">
          {!activeWorkForm || !activeWorkForm.assigned_operator_id ? (
            <div className="text-secondary small fst-italic d-flex align-items-center gap-1.5 py-1">
              <i className="ti ti-info-circle text-warning fs-5"></i>
              <span>No Work ID currently assigned to Stage #{stageId}. Assign a Work ID in Stage Management to start production.</span>
            </div>
          ) : (
            <div className="small font-mono text-secondary d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <span className="d-inline-flex align-items-center gap-1.5">
                  <i className="ti ti-id-badge text-primary fs-5"></i>
                  <strong className="text-dark">ACTIVE WORK ID:</strong>{' '}
                  <span className="text-primary fw-bold">{activeWorkForm.form_id}</span>
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Batch:</strong> <span className="text-dark fw-bold">{activeWorkForm.batch_no}</span>
                </span>
                {activeWorkForm.month_year && (
                  <>
                    <span>&bull;</span>
                    <span>
                      <strong>Date:</strong> <span className="text-dark fw-bold">{activeWorkForm.month_year}</span>
                    </span>
                  </>
                )}
                {!hideProductionMetrics && (
                  <>
                    <span>&bull;</span>
                    <span>
                      <strong>Target:</strong> <span className="text-dark fw-bold">{targetQuantity}</span>
                    </span>
                    <span>&bull;</span>
                    <span>
                      <strong>Completed:</strong> <span className="text-success fw-bold">{displayedCompletedCount}</span>
                    </span>
                  </>
                )}
                <span>&bull;</span>
                <span className={`badge px-2.5 py-1 ${activeWorkForm.status === 'IN_PROGRESS' ? 'bg-success text-white' : 'bg-primary text-white'}`}>
                  {activeWorkForm.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Left = Meter Body Image Preview, Right = Parameter Editor */}
      <div className="row g-4 mb-4">
        {/* LEFT COLUMN: Front Enclosure Laser Marking Preview & DB Saved Meters */}
        <div className="col-xl-6 col-lg-6 col-12 d-flex flex-column gap-3">
          {/* 1. Laser Marking Enclosure Preview Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <i className="ti ti-cpu fs-5 text-primary flex-shrink-0"></i>
                <h6 className="mb-0 fw-bold text-dark text-nowrap" style={{ fontSize: '13.5px' }}>
                  Laser Marking Preview
                </h6>
              </div>

              {/* 3D Mode Buttons (CAD & Polycarbonate) + Separate Actual Print Button on RIGHT SIDE */}
              <div className="d-flex align-items-center gap-1.5 flex-wrap">
                <span className="text-secondary fw-bold text-uppercase d-none d-xxl-inline" style={{ fontSize: '10px', letterSpacing: '0.6px' }}>
                  3D Mode:
                </span>
                <div className="btn-group btn-group-sm text-nowrap" role="group">
                  <button
                    type="button"
                    className={`btn px-2.5 py-1 text-xs fw-semibold ${viewMode === 'cad' ? 'btn-primary shadow-xs' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('cad')}
                    title="CAD Master Purple Enclosure Image"
                  >
                    CAD
                  </button>
                  <button
                    type="button"
                    className={`btn px-2.5 py-1 text-xs fw-semibold ${viewMode === 'actual' ? 'btn-primary shadow-xs' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('actual')}
                    title="Polycarbonate finish"
                  >
                    Polycarbonate
                  </button>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm px-2.5 py-1 text-xs fw-semibold text-nowrap d-inline-flex align-items-center gap-1.5 ms-2 ${viewMode === 'actual_print' ? 'text-white shadow-xs' : 'btn-outline-secondary bg-white text-dark'
                    }`}
                  style={
                    viewMode === 'actual_print'
                      ? { backgroundColor: '#ea580c', borderColor: '#ea580c' }
                      : {}
                  }
                  onClick={() => setViewMode('actual_print')}
                  title="Actual Print Photo Preview"
                >
                  <i
                    className="ti ti-photo"
                    style={{ fontSize: '13px', color: viewMode === 'actual_print' ? '#ffffff' : '#ea580c' }}
                  ></i>
                  <span>Actual Print</span>
                </button>
              </div>
            </div>

            <div className="card-body p-3 d-flex flex-column align-items-center justify-content-center bg-light-subtle">
              {/* Interactive Meter Body Preview Component with Assigned Work Order Layout */}
              {activeWorkForm ? (
                <MeterInteractiveTextEditor
                  readOnly={true}
                  variableTexts={currentConfig?.variableTexts || activeWorkForm.print_config?.variableTexts || []}
                  logos={currentConfig?.logos || activeWorkForm.print_config?.logos || []}
                  qrCodes={currentConfig?.qrCodes || activeWorkForm.print_config?.qrCodes || []}
                  actualPrintImage={currentConfig?.actualPrintImageUrl || activeWorkForm.print_config?.actualPrintImageUrl || null}
                  maxWidth="460px"
                  hideHeader={true}
                  viewMode={viewMode}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-device-laptop fs-1 text-secondary opacity-50 d-block mb-2"></i>
                  <h6 className="fw-semibold">No Assigned Work Order</h6>
                  <p className="small mb-0">Assign a Work ID in Stage Management to preview the housing layout.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        {canManageWorkId ? (
          /* ADMIN / SUPERVISOR VIEW: Work ID Parameter Configuration & Control Panel */
          <div className="col-xl-6 col-lg-6 col-12">
            <div className="card shadow-sm border-0 h-100 d-flex flex-column">
              <div className="card-header bg-white py-2.5 px-3.5 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="ti ti-adjustments-alt fs-4 text-primary"></i>
                  <h6 className="mb-0 fw-bold text-dark">
                    Parameter Specifications: <span className="font-mono text-primary">{activeFormId}</span>
                  </h6>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setCurrentConfig({ ...DEFAULT_PRINT_SPECS, workId: activeFormId })}
                    title="Reset to 1st image original specifications"
                  >
                    <i className="ti ti-refresh me-1"></i> Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-bold px-3 d-inline-flex align-items-center gap-1.5 shadow-2xs"
                    onClick={handleSaveWorkId}
                    disabled={saving}
                  >
                    <i className={`ti ${saving ? 'ti-loader spin' : 'ti-device-floppy'}`}></i>
                    <span>{saving ? 'Saving...' : 'Save & Update Work ID'}</span>
                  </button>
                </div>
              </div>

              {/* Tab navigation for parameter categories */}
              <div className="border-bottom bg-light px-3 pt-2">
                <ul className="nav nav-tabs card-header-tabs gap-1">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link fw-semibold small ${activeTab === 'branding' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveTab('branding')}
                    >
                      <i className="ti ti-award me-1"></i> Logos & Branding
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link fw-semibold small ${activeTab === 'identity' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveTab('identity')}
                    >
                      <i className="ti ti-qrcode me-1"></i> QR & Serial ID
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link fw-semibold small ${activeTab === 'specs' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveTab('specs')}
                    >
                      <i className="ti ti-bolt me-1"></i> Technical Ratings
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link fw-semibold small ${activeTab === 'compliance' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveTab('compliance')}
                    >
                      <i className="ti ti-shield-check me-1"></i> Utility & Compliance
                    </button>
                  </li>
                </ul>
              </div>

              {/* Tab Form Body */}
              <div className="card-body p-4 flex-grow-1 overflow-auto" style={{ maxHeight: '520px' }}>
                {/* TAB 1: LOGOS & BRANDING */}
                {activeTab === 'branding' && (
                  <div className="vstack gap-3">
                    <div>
                      <div className="p-3 bg-light rounded-3 border mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                            <i className="ti ti-typography text-primary fs-5"></i>
                            <span>Custom Variable Texts On Housing</span>
                          </span>
                          {canManageWorkId && (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-primary fw-semibold"
                              onClick={() => {
                                const list = currentConfig.variableTexts || [];
                                const nextNum = list.length + 1;
                                const newVT = {
                                  id: `vt-${Date.now()}`,
                                  text: `VARIABLE TEXT #${nextNum}`,
                                  x: 95,
                                  y: 40 + (nextNum * 25),
                                  leftPercent: 22,
                                  topPercent: 8 + (nextNum * 5),
                                  fontSize: 13,
                                  fontWeight: 'bold',
                                  color: '#0f172a'
                                };
                                handleParamChange('variableTexts', [...list, newVT]);
                              }}
                            >
                              <i className="ti ti-plus me-1"></i> Add Text
                            </button>
                          )}
                        </div>
                        {(!currentConfig.variableTexts || currentConfig.variableTexts.length === 0) ? (
                          <div className="text-muted small py-1">No custom variable texts added yet. Click "+ Add Text" to place text on meter.</div>
                        ) : (
                          <div className="vstack gap-2">
                            {currentConfig.variableTexts.map((vt, idx) => (
                              <div key={vt.id || idx} className="p-2 bg-white rounded border">
                                <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                                  <span className="badge bg-light text-primary border font-mono small">#{idx + 1}</span>
                                  <span className="badge bg-secondary-subtle text-dark font-mono text-xs">
                                    X: {vt.x || Math.round(vt.leftPercent * 4)}px &bull; Y: {vt.y || Math.round(vt.topPercent * 4)}px
                                  </span>
                                  {canManageWorkId && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0 border-0"
                                      onClick={() => {
                                        const updated = currentConfig.variableTexts.filter(t => t.id !== vt.id);
                                        handleParamChange('variableTexts', updated);
                                      }}
                                    >
                                      <i className="ti ti-trash"></i>
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  className="form-control form-control-sm font-sans"
                                  value={vt.text || ''}
                                  readOnly={!canManageWorkId}
                                  onChange={(e) => {
                                    const updated = currentConfig.variableTexts.map(t => t.id === vt.id ? { ...t, text: e.target.value } : t);
                                    handleParamChange('variableTexts', updated);
                                  }}
                                  placeholder="Enter variable text..."
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <label className="form-label fw-bold text-dark small mb-1.5">
                        Select Primary Utility / OEM Logo
                      </label>
                      <div className="row g-2">
                        {UTILITY_LOGO_OPTIONS.map(opt => (
                          <div key={opt.id} className="col-md-6 col-12">
                            <div
                              className={`p-2.5 rounded-3 border d-flex align-items-center gap-2 transition-all ${currentConfig.logoType === opt.id
                                ? 'border-primary bg-primary-subtle text-primary shadow-xs'
                                : 'border-light-subtle bg-white hover-bg-light text-dark'
                                }`}
                              style={{
                                cursor: canManageWorkId ? 'pointer' : 'default',
                                opacity: !canManageWorkId && currentConfig.logoType !== opt.id ? 0.45 : 1
                              }}
                              onClick={() => canManageWorkId && handleParamChange('logoType', opt.id)}
                            >
                              <i className={`ti ${opt.icon} fs-5 ${currentConfig.logoType === opt.id ? 'text-primary' : 'text-secondary'}`}></i>
                              <div className="lh-1 text-truncate">
                                <span className="small fw-semibold d-block text-truncate">{opt.name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(currentConfig.logoType === 'custom' || !currentConfig.logoType) && (
                      <div className="row g-2 p-2.5 bg-light rounded border">
                        <div className="col-md-7">
                          <label className="form-label text-muted small fw-semibold">Custom Utility Text</label>
                          <input
                            type="text"
                            className="form-control form-control-sm font-sans"
                            placeholder="e.g. ADANI ELECTRICITY"
                            value={currentConfig.customLogoText || ''}
                            readOnly={!canManageWorkId}
                            onChange={(e) => handleParamChange('customLogoText', e.target.value)}
                          />
                        </div>
                        <div className="col-md-5">
                          <label className="form-label text-muted small fw-semibold">Upload Logo Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control form-control-sm"
                            disabled={!canManageWorkId}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => handleParamChange('customLogoUrl', ev.target.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-dark small mb-1">Brand Tagline</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={currentConfig.logoTagline || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('logoTagline', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-dark small mb-1">Top Right Sub-Brand Title</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-sans"
                          value={currentConfig.brandTitle || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('brandTitle', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-light rounded-3 border">
                      <h6 className="fw-bold text-dark small mb-1">Work ID Branding Scope</h6>
                      <p className="text-secondary small mb-0">
                        When changing the logo for <span className="font-mono text-dark fw-bold">{activeFormId}</span>, only meters printed under this Work ID will feature this utility logo. Other Work IDs can maintain separate utility seals.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: QR & SERIAL IDENTIFICATION */}
                {activeTab === 'identity' && (
                  <div className="vstack gap-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">
                          Meter Serial Number (S/N) *
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold"
                          value={currentConfig.serialNo || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('serialNo', e.target.value)}
                        />
                        <small className="text-muted">Auto-increments after each successful laser print cycle.</small>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">
                          Modem IMEI Number *
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          maxLength="15"
                          value={currentConfig.imei || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('imei', e.target.value)}
                        />
                        <small className="text-muted">15-digit cellular IMEI mapped from Stage 4 NIC JIG test.</small>
                      </div>
                    </div>

                    <div>
                      <label className="form-label fw-semibold text-dark small mb-1">
                        Dynamic 2D DataMatrix / QR Code Value
                      </label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm font-mono"
                        placeholder="Leave blank to auto-encode: WorkID | Serial | IMEI | Batch"
                        value={currentConfig.qrValue || ''}
                        readOnly={!canManageWorkId}
                        onChange={(e) => handleParamChange('qrValue', e.target.value)}
                      />
                      <small className="text-muted">
                        Current QR Encoded: <span className="font-mono text-dark">{currentConfig.qrValue || `${activeFormId}|SN:${currentConfig.serialNo}|IMEI:${currentConfig.imei}|TYPE:${currentConfig.meterType}`}</span>
                      </small>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-dark small mb-1">WAN Cellular Frequencies</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          value={currentConfig.wanComm || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('wanComm', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-dark small mb-1">Simulated LCD Reading (kWh)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold"
                          value={currentConfig.lcdReading || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('lcdReading', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: TECHNICAL SPECIFICATIONS */}
                {activeTab === 'specs' && (
                  <div className="vstack gap-3">
                    <div>
                      <label className="form-label fw-bold text-dark small mb-1">Meter Specification Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={currentConfig.meterTitle || ''}
                        readOnly={!canManageWorkId}
                        onChange={(e) => handleParamChange('meterTitle', e.target.value)}
                      />
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">Meter Model / Type</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold"
                          value={currentConfig.meterType || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('meterType', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">Voltage & Current Rating</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          value={currentConfig.voltageCurrent || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('voltageCurrent', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark small mb-1">Accuracy Class</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={currentConfig.accuracyClass || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('accuracyClass', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark small mb-1">Category & Protection</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={currentConfig.category || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('category', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark small mb-1">Pulse Constant</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold"
                          value={currentConfig.pulseConstant || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('pulseConstant', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: UTILITY & COMPLIANCE */}
                {activeTab === 'compliance' && (
                  <div className="vstack gap-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">Property of (Utility / Discom)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={currentConfig.propertyOf || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('propertyOf', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-dark small mb-1">LOA Number</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          value={currentConfig.loaNo || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('loaNo', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-bold text-dark small mb-1">Manufacturing Date (MM/YY)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold"
                          value={currentConfig.mfgDate || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('mfgDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-semibold text-dark small mb-1">Manufacturer Name & Address</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={currentConfig.manufacturer || ''}
                          readOnly={!canManageWorkId}
                          onChange={(e) => handleParamChange('manufacturer', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label fw-semibold text-dark small mb-1">BIS Certification Notice</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={currentConfig.bisText || ''}
                        readOnly={!canManageWorkId}
                        onChange={(e) => handleParamChange('bisText', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions footer */}
              {canManageWorkId && (
                <div className="card-footer bg-white border-top py-3 px-4 d-flex align-items-center justify-content-between">
                  <span className="small text-muted font-mono">
                    Active ID: <strong className="text-primary">{activeFormId}</strong> &bull; Changes ready to apply
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                    onClick={handleSaveWorkId}
                    disabled={saving}
                  >
                    <i className={`ti ${saving ? 'ti-loader spin' : 'ti-check'}`}></i>
                    <span>{saving ? 'Updating...' : `Update ${activeFormId}`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* OPERATOR VIEW: Station Laser Engraving & Optical Telemetry Stream (Right Column) */
          <div className="col-xl-6 col-lg-6 col-12">
            <div className="card shadow-sm border-0 d-flex flex-column">
              <div className="card-body p-3.5 d-flex flex-column gap-3">
                {/* 1. Optical Probe Cable Status & In-App Serial Port Connection Bar */}
                <div
                  className="p-3 rounded-3 border border-secondary-subtle bg-white d-flex flex-column shadow-2xs"
                  style={{ gap: '10px' }}
                >
                  <div className="d-flex align-items-center justify-content-between" style={{ gap: '12px' }}>
                    {/* Left: USB Icon + Port Information */}
                    <div className="d-flex align-items-center flex-shrink-0" style={{ gap: '12px' }}>
                      <div
                        className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
                        style={{ width: '38px', height: '38px' }}
                      >
                        <i
                          className={`ti ${opticalStatus.checking
                            ? 'ti-loader spin'
                            : opticalStatus.connected
                              ? 'ti-plug-connected'
                              : 'ti-usb'
                            } fs-5`}
                        ></i>
                      </div>

                      <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
                        <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13.5px', lineHeight: 1.2 }}>
                          Optical Port
                        </div>
                        <div className="d-flex align-items-center small text-nowrap" style={{ gap: '6px', fontSize: '11px' }}>
                          <span
                            className={`rounded-circle d-inline-block flex-shrink-0 ${opticalStatus.connected
                              ? 'bg-success'
                              : opticalStatus.checking
                                ? 'bg-warning'
                                : 'bg-danger'
                              }`}
                            style={{ width: '6px', height: '6px' }}
                          ></span>
                          <span
                            className={`fw-medium ${opticalStatus.connected
                              ? 'text-success'
                              : opticalStatus.checking
                                ? 'text-warning-emphasis'
                                : 'text-muted'
                              }`}
                          >
                            {opticalStatus.connected
                              ? (opticalStatus.friendlyName
                                ? (opticalStatus.friendlyName.includes(formatSerialSummary(usbSerialConfig))
                                  ? opticalStatus.friendlyName
                                  : `${opticalStatus.friendlyName} (${formatSerialSummary(usbSerialConfig)})`)
                                : `${selectedOpticalPort || opticalStatus.port || 'Connected'} (${formatSerialSummary(usbSerialConfig)})`)
                              : opticalStatus.checking
                                ? 'Connecting...'
                                : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Settings Toggle Button */}
                    <div className="d-flex align-items-center justify-content-end">
                      <button
                        type="button"
                        className={`btn btn-sm ${showUsbSettings
                          ? 'text-white shadow-xs'
                          : 'btn-outline-secondary'
                          } px-2.5 fw-semibold shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0`}
                        style={{
                          height: '32px',
                          fontSize: '12px',
                          gap: '5px',
                          backgroundColor: showUsbSettings ? '#e05626' : undefined,
                          borderColor: showUsbSettings ? '#e05626' : undefined
                        }}
                        onClick={() => {
                          const next = !showUsbSettings;
                          setShowUsbSettings(next);
                          if (next) {
                            checkOpticalCable(false);
                            refreshPairedPorts();
                          }
                        }}
                        title="Configure USB Port COM & Serial Settings"
                      >
                        <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
                        <span>Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Settings Accordion / Collapsible Panel */}
                  {showUsbSettings && (
                    <ComPortSettingsPanel
                      title="USB PORT - COM PORT SETTINGS"
                      config={usbSerialConfig}
                      onChange={updateUsbConfig}
                      onClose={() => setShowUsbSettings(false)}
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
                  )}
                </div>

                {/* 2. Laser Port Serial COM Port Connection Bar */}
                <div
                  className="p-3 rounded-3 border border-secondary-subtle bg-white d-flex flex-column shadow-2xs"
                  style={{ gap: '10px' }}
                >
                  <div className="d-flex align-items-center justify-content-between" style={{ gap: '12px' }}>
                    {/* Left: Laser/Printer Icon + Port Information */}
                    <div className="d-flex align-items-center flex-shrink-0" style={{ gap: '12px' }}>
                      <div
                        className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
                        style={{ width: '38px', height: '38px' }}
                      >
                        <i
                          className={`ti ${laserStatus.checking
                            ? 'ti-loader spin'
                            : laserStatus.connected
                              ? 'ti-printer'
                              : 'ti-printer-off'
                            } fs-5`}
                        ></i>
                      </div>

                      <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
                        <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13.5px', lineHeight: 1.2 }}>
                          Laser Port
                        </div>
                        <div className="d-flex align-items-center small text-nowrap" style={{ gap: '6px', fontSize: '11px' }}>
                          <span
                            className={`rounded-circle d-inline-block flex-shrink-0 ${laserStatus.connected
                              ? 'bg-success'
                              : laserStatus.checking
                                ? 'bg-warning'
                                : 'bg-danger'
                              }`}
                            style={{ width: '6px', height: '6px' }}
                          ></span>
                          <span
                            className={`fw-medium ${laserStatus.connected
                              ? 'text-success'
                              : laserStatus.checking
                                ? 'text-warning-emphasis'
                                : 'text-muted'
                              }`}
                          >
                            {laserStatus.connected
                              ? (laserStatus.friendlyName
                                ? (laserStatus.friendlyName.includes(formatSerialSummary(laserSerialConfig))
                                  ? laserStatus.friendlyName
                                  : `${laserStatus.friendlyName} (${formatSerialSummary(laserSerialConfig)})`)
                                : `${selectedLaserPort || laserStatus.port || 'Connected'} (${formatSerialSummary(laserSerialConfig)})`)
                              : laserStatus.checking
                                ? 'Connecting...'
                                : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Settings Toggle Button */}
                    <div className="d-flex align-items-center justify-content-end">
                      <button
                        type="button"
                        className={`btn btn-sm ${showLaserSettings
                          ? 'text-white shadow-xs'
                          : 'btn-outline-secondary'
                          } px-2.5 fw-semibold shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0`}
                        style={{
                          height: '32px',
                          fontSize: '12px',
                          gap: '5px',
                          backgroundColor: showLaserSettings ? '#e05626' : undefined,
                          borderColor: showLaserSettings ? '#e05626' : undefined
                        }}
                        onClick={() => {
                          const next = !showLaserSettings;
                          setShowLaserSettings(next);
                          if (next) {
                            checkLaserStatus();
                            refreshPairedLaserPorts();
                          }
                        }}
                        title="Configure Laser Port COM & Serial Settings"
                      >
                        <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
                        <span>Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Settings Accordion / Collapsible Panel */}
                  {showLaserSettings && (
                    <ComPortSettingsPanel
                      title="LASER PORT - COM PORT SETTINGS"
                      config={laserSerialConfig}
                      onChange={updateLaserConfig}
                      onClose={() => setShowLaserSettings(false)}
                      commChannelContent={
                        <div className="d-flex flex-row align-items-center" style={{ gap: '8px' }}>
                          <div className="input-group input-group-sm flex-grow-1">
                            <span className="input-group-text bg-white border-secondary-subtle text-muted px-2.5">
                              <i className="ti ti-cpu" style={{ fontSize: '12px' }}></i>
                            </span>
                            <select
                              className="form-select form-select-sm fw-medium bg-white border-secondary-subtle text-truncate"
                              style={{ height: '34px', fontSize: '12px' }}
                              value={selectedLaserPortId}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__laser_pair_new__') {
                                  setSelectedLaserPortId('__laser_pair_new__');
                                  handleConnectLaser(null, true);
                                  return;
                                }
                                setSelectedLaserPortId(val);
                                if (val && val.startsWith('laser_paired_')) {
                                  const idx = parseInt(val.replace('laser_paired_', ''), 10);
                                  if (pairedLaserPorts[idx]) {
                                    setSelectedLaserPort(pairedLaserPorts[idx].friendlyName);
                                  }
                                } else if (val && val.startsWith('laser_server_')) {
                                  setSelectedLaserPort(val.replace('laser_server_', ''));
                                }
                              }}
                              disabled={laserStatus.checking || laserStatus.connected}
                            >
                              <option value="" disabled>Select / Connect Laser Port...</option>
                              {laserPortOptions.length > 0 ? (
                                laserPortOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id} disabled={opt.isTaken}>
                                    {opt.label}{opt.takenMsg}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>No Laser Port Detected</option>
                              )}
                              <option value="__laser_pair_new__">
                                Select / Pair COM Port from Device Manager...
                              </option>
                            </select>
                          </div>

                          {!laserStatus.connected ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-success px-3 fw-semibold text-white shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                              style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                              onClick={handleDirectConnectLaser}
                              disabled={laserStatus.checking}
                              title="Connect Laser COM Port"
                            >
                              <i className={`ti ${laserStatus.checking ? 'ti-loader spin' : 'ti-plug'}`} style={{ fontSize: '13px' }}></i>
                              <span>{laserStatus.checking ? 'Connecting...' : 'Connect Port'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger px-3 fw-semibold shadow-xs d-inline-flex align-items-center justify-content-center text-nowrap flex-shrink-0"
                              style={{ gap: '6px', height: '34px', fontSize: '12px' }}
                              onClick={handleToggleLaserConnection}
                              disabled={laserStatus.checking}
                              title={`Disconnect (${laserStatus.friendlyName || laserStatus.port || 'Laser Port'})`}
                            >
                              <i className="ti ti-power" style={{ fontSize: '13px' }}></i>
                              <span>Disconnect</span>
                            </button>
                          )}
                        </div>
                      }
                    />
                  )}
                </div>

                {/* 3. Live DLMS Optical Read Telemetry Showcase Card */}
                {/* {lastReadMeterData && (
                  <div className="card border-success border-2 bg-success-subtle bg-opacity-10 shadow-2xs">
                    <div className="card-header bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <i className="ti ti-scan text-success fs-5"></i>
                        <span className="fw-bold text-success-emphasis">Meter DLMS Read (Live Telemetry)</span>
                      </div>
                      <span className="badge bg-success text-white font-mono px-2 py-0.5">
                        <i className="ti ti-circle-check me-1"></i>Saved in DB &bull; Work ID: {activeFormId}
                      </span>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2 font-mono">
                        <div className="col-sm-6">
                          <div className="p-2.5 bg-white rounded border">
                            <span className="text-secondary small d-block">Meter Serial No:</span>
                            <strong className="text-primary fs-6 d-flex align-items-center gap-1">
                              <i className="ti ti-barcode"></i> {lastReadMeterData.serialNo || '-'}
                            </strong>
                            <small className="text-muted text-2xs">OBIS: 0.0.96.1.0.255</small>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="p-2.5 bg-white rounded border">
                            <span className="text-secondary small d-block">Device No:</span>
                            <strong className="text-dark fs-6 d-flex align-items-center gap-1">
                              <i className="ti ti-cpu"></i> {lastReadMeterData.deviceNo || '-'}
                            </strong>
                            <small className="text-muted text-2xs">OBIS: 0.0.96.1.2.255</small>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="p-2.5 bg-white rounded border">
                            <span className="text-secondary small d-block">Modem IMEI No:</span>
                            <strong className="text-success fs-6 d-flex align-items-center gap-1">
                              <i className="ti ti-antenna"></i> {lastReadMeterData.imeiNo || '-'}
                            </strong>
                            <small className="text-muted text-2xs">OBIS: 0.0.155.1.2.255 (Item #3)</small>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="p-2.5 bg-white rounded border">
                            <span className="text-secondary small d-block">NIC Sr.No:</span>
                            <strong className="text-dark fs-6 d-flex align-items-center gap-1">
                              <i className="ti ti-id"></i> {lastReadMeterData.nicSrNo || '-'}
                            </strong>
                            <small className="text-muted text-2xs">OBIS: 0.0.155.1.1.255</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )} */}

                {/* 3. Active Work Order Specs Summary */}
                <div className="card border bg-light-subtle shadow-none">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-dark small text-uppercase d-flex align-items-center gap-1.5">
                        <i className="ti ti-id-badge text-primary fs-5"></i>
                        <span>Active Work ID:</span>
                        <span className="font-mono text-primary fw-bold ms-1">{activeFormId}</span>
                      </span>
                      <span className="badge bg-primary text-white font-mono px-2 py-0.5 small">
                        {activeWorkForm?.batch_no || ''}
                      </span>
                    </div>

                    <div className="row g-2 small font-mono mb-2">
                      <div className="col-6">
                        <span className="text-muted">Serial No:</span> <strong className="text-dark">{currentConfig.serialNo || '-'}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">IMEI No:</span> <strong className="text-dark">{currentConfig.imei || '-'}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">MM/YYYY:</span> <strong className="text-dark">{activeWorkForm?.month_year || currentConfig.mfgDate || '-'}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">NIC Sr.No:</span>{' '}
                        <strong className="text-dark">
                          {(currentConfig.nicsrno && currentConfig.nicsrno !== `NIC-${currentConfig.serialNo}`) ? currentConfig.nicsrno : '-'}
                        </strong>
                      </div>
                    </div>

                    {lastReadMeterData?.isDemo && (
                      <div className="mb-2 p-1.5 px-2 bg-info-subtle text-info-emphasis rounded text-2xs fw-bold d-flex align-items-center gap-1 border border-info-subtle">
                        <i className="ti ti-test-pipe fs-6"></i>
                        <span>DEMO MODE &mdash; Meter details loaded for laser testing (Will NOT be saved to database)</span>
                      </div>
                    )}

                    {lastReadMeterData?.savedToDb === false && !lastReadMeterData?.isDemo && (
                      <div className="mb-2 p-1.5 px-2 bg-danger-subtle text-danger rounded text-2xs fw-bold d-flex align-items-center gap-1 border border-danger-subtle">
                        <i className="ti ti-alert-circle fs-6"></i>
                        <span>NOT SAVED TO DB (Missing from meter: {lastReadMeterData.missingFields?.join(', ') || 'Serial No, IMEI No, or NIC Sr.No'})</span>
                      </div>
                    )}

                    {/* Progress Bar (Operator only; hidden for Supervisor and QC) */}
                    {!hideProductionMetrics && (
                      <div className="pt-2 border-top">
                        <div className="d-flex justify-content-between align-items-center mb-1 text-xs font-mono">
                          <span className="text-secondary">Batch Production Progress:</span>
                          <strong className="text-dark">
                            {displayedCompletedCount} / {targetQuantity} Meters
                            ({progressPercentage}%)
                          </strong>
                        </div>
                        <div className="progress" style={{ height: '7px' }}>
                          <div
                            className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                            style={{
                              width: `${progressBarWidth}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Live Console / Terminal Stream (Collapsible via View Terminal button) */}
                <div className="d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold d-flex align-items-center gap-1">
                      <i className="ti ti-terminal text-primary"></i>
                      <span>Telemetry Stream:</span>
                    </span>
                    <div className="d-flex align-items-center gap-2">
                      {showTerminal && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-secondary text-decoration-none p-0 text-xs"
                          onClick={() => setPrintLogs([{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Telemetry stream cleared.', status: 'INFO' }])}
                        >
                          Clear Logs
                        </button>
                      )}
                      <button
                        type="button"
                        className={`btn btn-sm font-mono d-inline-flex align-items-center gap-1 px-2.5 py-1 ${showTerminal ? 'btn-primary text-white shadow-2xs' : 'btn-light border text-secondary'}`}
                        onClick={() => setShowTerminal(prev => !prev)}
                      >
                        <i className={`ti ${showTerminal ? 'ti-eye-off' : 'ti-terminal-2'}`}></i>
                        <span>{showTerminal ? 'Hide' : 'View Terminal'}</span>
                      </button>
                    </div>
                  </div>
                  {showTerminal && (
                    <div
                      className="p-3 font-mono text-xs bg-dark text-light rounded-3 flex-grow-1 shadow-inner border border-dark-subtle mt-1"
                      style={{
                        minHeight: '220px',
                        maxHeight: '280px',
                        overflowX: 'auto',
                        overflowY: 'auto'
                      }}
                    >
                      <div style={{ minWidth: 'max-content' }}>
                        {printLogs.map(lg => (
                          <div key={lg.id} className="d-flex align-items-center gap-2 mb-1.5 lh-sm text-nowrap">
                            <span className="text-secondary font-mono flex-shrink-0" style={{ fontSize: '11px' }}>[{lg.time}]</span>
                            <span className={`badge px-1 py-0 text-xs font-mono flex-shrink-0 ${lg.status === 'SUCCESS' ? 'bg-success' : lg.status === 'ERROR' ? 'bg-danger' : 'bg-primary'}`}>
                              {lg.status}
                            </span>
                            <span className="text-light text-nowrap" style={{ fontSize: '11.5px' }}>{lg.msg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Operator Action Footer: Read Meter & Execute Laser Print */}
              <div className="card-footer bg-white border-top p-3 d-flex flex-column align-items-stretch gap-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {/* Reset Button (Only displayed when some meter data is missing) */}
                  {isIncompleteRead && (
                    <button
                      type="button"
                      className="btn btn-outline-danger px-3 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-1.5 text-nowrap"
                      onClick={handleResetIncompleteRead}
                      title="Clear incomplete meter data and re-enable Read Meter"
                    >
                      <i className="ti ti-rotate fs-5"></i>
                      <span>Reset</span>
                    </button>
                  )}

                  {/* Read Meter Button (Disabled when reading, when all 3 data are verified for print, or when incomplete read needs Reset) */}
                  <button
                    type="button"
                    className="btn btn-success px-3.5 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2 text-nowrap"
                    onClick={handleReadMeterOptical}
                    disabled={isReadMeterDisabled || isLaserActive}
                    title={
                      !opticalStatus.connected
                        ? 'Optical cable is disconnected. Please connect USB Optical Cable in Device Manager to enable.'
                        : (!activeFormId || activeFormId === 'UNASSIGNED')
                          ? 'Please select a Work ID first'
                          : hasValidMeterData
                            ? 'All 3 meter numbers verified and saved to database. Ready for Laser Print.'
                            : isIncompleteRead
                              ? 'Meter read was incomplete. Click Reset to clear old data before reading again.'
                              : `Read meter details via Optical Probe DLMS (${opticalStatus.friendlyName || selectedOpticalPort || opticalStatus.port})`
                    }
                  >
                    <i className={`ti ${isReadingOptical ? 'ti-loader spin' : 'ti-scan'} fs-5`}></i>
                    <span>{isReadingOptical ? 'Reading...' : 'Read Meter'}</span>
                  </button>

                  {/* Demo Read Meter Button (Manual Type S/N, IMEI, NIC for Laser Print) */}
                  <button
                    type="button"
                    className="btn btn-outline-success px-3 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2 text-nowrap"
                    onClick={handleDemoReadMeter}
                    disabled={isReadingOptical || isPrinting || isLaserActive || !activeFormId || activeFormId === 'UNASSIGNED'}
                    title="Manually enter Meter Serial, IMEI, and NIC Serial for testing/demo"
                  >
                    <i className="ti ti-keyboard fs-5"></i>
                    <span>Demo Read Meter</span>
                  </button>

                  {/* Laser Print & Stop Laser Toggle:
                      When Laser Print is clicked: hides Laser Print button, shows Stop Laser button, waits for F1, F2, F3 queries.
                      When Stop Laser is clicked: stops serial communication and finalizes database record. */}
                  {isLaserActive ? (
                    <button
                      type="button"
                      className="btn btn-danger px-3.5 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2 text-nowrap"
                      onClick={handleStopLaserPrint}
                      disabled={isPrinting}
                      title="Stop serial communication with Laser Machine"
                    >
                      <i className={`ti ${isPrinting ? 'ti-loader spin' : 'ti-player-stop-filled'} fs-5`}></i>
                      <span>{isPrinting ? 'Stopping Laser...' : 'Stop Laser'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary px-3.5 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2 text-nowrap"
                      onClick={handleStartLaserPrint}
                      disabled={
                        isPrinting ||
                        isLaserActive ||
                        !laserStatus.connected ||
                        (!opticalStatus.connected && !lastReadMeterData) ||
                        !activeFormId ||
                        activeFormId === 'UNASSIGNED' ||
                        (!activeWorkForm?.assigned_operator_id && !isSupervisor && !isQC && !isAdmin) ||
                        !hasValidMeterData
                      }
                      title={
                        !laserStatus.connected
                          ? 'Laser Machine serial COM port is disconnected. Please connect Laser Port above to enable.'
                          : !opticalStatus.connected && !lastReadMeterData
                            ? 'Optical cable is disconnected. Please connect USB Optical Cable or use Demo Read Meter to enable.'
                            : (!activeFormId || activeFormId === 'UNASSIGNED')
                              ? 'Please assign a Work ID to Stage first'
                              : (!activeWorkForm?.assigned_operator_id && !isSupervisor && !isQC && !isAdmin)
                                ? 'Operator assignment required'
                                : isMeterAlreadyPrinted
                                  ? 'Laser Print Disabled: This meter has already been laser printed.'
                                  : !hasAllThreeNumbers
                                    ? 'Cannot Print: All 3 numbers (Serial No, IMEI No, NIC Sr. No) are required before laser printing.'
                                    : (!lastReadMeterData?.isDemo && (lastReadMeterData?.savedToDb === false || !lastReadMeterData?.recordId))
                                      ? 'Cannot Print: Meter data was NOT saved to database due to missing meter fields.'
                                      : !hasValidMeterData
                                        ? 'Please read meter using "Read Meter" or "Demo Read Meter" first to enable Laser Print'
                                        : 'Execute Laser Print via Laser Machine Serial COM'
                      }
                    >
                      <i className={`ti ${isPrinting ? 'ti-loader spin' : 'ti-flame'} fs-5`}></i>
                      <span>Laser Print</span>
                    </button>
                  )}
                </div>
                {isLaserActive && (
                  <div className="w-100 mt-2 px-3 py-2 rounded-3 bg-danger-subtle border border-danger-subtle d-flex align-items-center justify-content-between flex-wrap gap-2 text-dark">
                    <div className="d-flex align-items-center gap-2">
                      <span className="spinner-grow spinner-grow-sm text-danger" role="status"></span>
                      <strong className="text-danger small">Laser Communication Active:</strong>
                      <span className="small text-muted">Listening for Laser Machine requests (9600 8N1) &bull;</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className={`badge px-2 py-1 font-mono ${laserQueryStatus.f3 ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        {laserQueryStatus.f3 ? '✓ F3 (Serial) Sent' : 'F3 (Serial): Waiting...'}
                      </span>
                      <span className={`badge px-2 py-1 font-mono ${laserQueryStatus.f1 ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        {laserQueryStatus.f1 ? '✓ F1 (IMEI) Sent' : 'F1 (IMEI): Waiting...'}
                      </span>
                      <span className={`badge px-2 py-1 font-mono ${laserQueryStatus.f2 ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        {laserQueryStatus.f2 ? '✓ F2 (NIC) Sent' : 'F2 (NIC): Waiting...'}
                      </span>
                    </div>
                    <div className="small text-danger fw-semibold">
                      Click &ldquo;Stop Laser&rdquo; when marking completes to stop serial comm
                    </div>
                  </div>
                )}
                {renderReadMeterStatusLine()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Laser Station Logs & Optical Probe (shown at bottom for Admin / Supervisor) */}
      {canManageWorkId && (
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="ti ti-terminal-2 text-primary fs-5"></i>
                  <h6 className="mb-0 fw-bold text-dark">Station Laser Engraving & Optical Telemetry Stream</h6>
                  <span className={`badge font-mono px-2 py-0.5 ms-2 ${opticalStatus.connected ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                    <i className={`ti ${opticalStatus.connected ? 'ti-plug-connected' : 'ti-plug-connected-x'} me-1`}></i>
                    {opticalStatus.connected ? `Optical: ${opticalStatus.port}` : 'Optical: Disconnected'}
                  </span>
                  <span className={`badge font-mono px-2 py-0.5 ms-1 ${laserStatus.connected ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                    <i className={`ti ${laserStatus.connected ? 'ti-printer' : 'ti-printer-off'} me-1`}></i>
                    {laserStatus.connected ? `Laser: ${laserStatus.port}` : 'Laser: Disconnected'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm font-mono d-inline-flex align-items-center gap-1 ${showTerminal ? 'btn-primary text-white shadow-2xs' : 'btn-outline-secondary'}`}
                    onClick={() => setShowTerminal(prev => !prev)}
                  >
                    <i className={`ti ${showTerminal ? 'ti-eye-off' : 'ti-terminal-2'}`}></i>
                    <span>{showTerminal ? 'Hide Terminal' : 'View Terminal'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary font-sans"
                    onClick={() => checkOpticalCable(true)}
                    disabled={opticalStatus.checking}
                  >
                    <i className={`ti ${opticalStatus.checking ? 'ti-loader spin' : 'ti-refresh'} me-1`}></i>
                    Check Cable
                  </button>
                  {isIncompleteRead && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger fw-bold d-inline-flex align-items-center gap-1.5"
                      onClick={handleResetIncompleteRead}
                      title="Clear incomplete meter data and re-enable Read Meter"
                    >
                      <i className="ti ti-rotate"></i>
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-bold d-inline-flex align-items-center gap-1.5"
                    onClick={handleReadMeterOptical}
                    disabled={isReadMeterDisabled}
                    title={
                      !opticalStatus.connected
                        ? 'Connect USB Optical Cable in Device Manager to enable'
                        : (!activeFormId || activeFormId === 'UNASSIGNED')
                          ? 'Please select a Work ID first'
                          : hasValidMeterData
                            ? 'All 3 meter numbers verified and saved to database. Ready for Laser Print.'
                            : isIncompleteRead
                              ? 'Meter read was incomplete. Click Reset to clear old data before reading again.'
                              : `Read meter via DLMS optical probe (${opticalStatus.friendlyName || selectedOpticalPort || opticalStatus.port})`
                    }
                  >
                    <i className={`ti ${isReadingOptical ? 'ti-loader spin' : 'ti-scan'}`}></i>
                    <span>{isReadingOptical ? 'Reading...' : 'Read Meter'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success fw-bold d-inline-flex align-items-center gap-1.5"
                    onClick={handleDemoReadMeter}
                    disabled={isReadingOptical || isPrinting || !activeFormId || activeFormId === 'UNASSIGNED'}
                    title="Manually enter Meter Serial, IMEI, and NIC Serial for testing/demo"
                  >
                    <i className="ti ti-keyboard"></i>
                    <span>Demo Read Meter</span>
                  </button>
                </div>
              </div>
              {renderReadMeterStatusLine('px-3 py-2 border-bottom')}
              {showTerminal && (
                <div
                  className="card-body p-3 font-mono text-xs bg-dark text-light rounded-bottom"
                  style={{ maxHeight: '220px', overflowX: 'auto', overflowY: 'auto' }}
                >
                  <div style={{ minWidth: 'max-content' }}>
                    {printLogs.map(lg => (
                      <div key={lg.id} className="d-flex align-items-center gap-2 mb-1 text-nowrap">
                        <span className="text-muted flex-shrink-0">[{lg.time}]</span>
                        <span className={`badge px-1.5 py-0.5 text-xs flex-shrink-0 ${lg.status === 'SUCCESS' ? 'bg-success' : lg.status === 'ERROR' ? 'bg-danger' : 'bg-primary'}`}>
                          {lg.status}
                        </span>
                        <span className="text-light text-nowrap">{lg.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={`Create Work Order for Stage #${stageId}: ${stageTitle}`}
      >
        <form onSubmit={handleCreateNewForm}>
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <label className="form-label fw-semibold text-dark small">Work ID / Form ID *</label>
              <input
                type="text"
                className="form-control form-control-sm font-mono fw-bold"
                required
                value={newFormId}
                onChange={(e) => setNewFormId(e.target.value)}
              />
            </div>
            <div className="col-md-7">
              <label className="form-label fw-semibold text-dark small">Form / Work Title *</label>
              <input
                type="text"
                className="form-control form-control-sm"
                required
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold text-dark small text-nowrap">Production Batch No *</label>
              <input
                type="text"
                className="form-control form-control-sm font-mono"
                required
                value={newBatchNo}
                onChange={(e) => setNewBatchNo(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-dark small text-nowrap">Target Quantity (Meters) *</label>
              <input
                type="number"
                min="1"
                className="form-control form-control-sm"
                required
                value={newTargetQty}
                onChange={(e) => setNewTargetQty(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold text-dark small text-nowrap">Month and Year</label>
              <input
                type="text"
                className="form-control form-control-sm font-mono"
                value={newMonthYear}
                onChange={(e) => setNewMonthYear(e.target.value)}
                placeholder="MM/YYYY"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Variable / Custom Text</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g. ZENMETER SMART METER or Utility Name"
              value={newCustomText}
              onChange={(e) => setNewCustomText(e.target.value)}
            />
            <small className="text-muted text-xs">Laser marking machine will engrave this custom text on the meter housing.</small>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Process Instructions & Checklist</label>
            <textarea
              className="form-control form-control-sm"
              rows="2"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="d-flex justify-content-end gap-2 pt-2 border-top">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm btn-primary fw-semibold px-3"
            >
              Create Form & Work ID
            </button>
          </div>
        </form>
      </Modal>

      {/* 1st Time Connection Guide Modal for Other Laptops */}
      <Modal
        isOpen={showInsecureHelpModal}
        onClose={() => setShowInsecureHelpModal(false)}
        title="1st-Time Setup: Enable USB Optical Cable on this Laptop"
        size="modal-lg"
      >
        <div className="p-3">
          <div className="alert alert-warning d-flex align-items-start gap-2.5 mb-3">
            <i className="ti ti-alert-triangle fs-4 text-warning flex-shrink-0 mt-0.5"></i>
            <div>
              <strong className="d-block mb-1">One-Time Chrome Setup Required:</strong>
              <div className="small">
                Google Chrome blocks websites from reading Device Manager over local network IP addresses.
                Follow these 4 quick steps once on this laptop so Chrome can connect directly to your <strong>Optical Port</strong>:
              </div>
            </div>
          </div>

          <ol className="list-group list-group-numbered mb-3 font-sans small">
            <li className="list-group-item d-flex justify-content-between align-items-start py-2.5">
              <div className="ms-2 me-auto">
                <div className="fw-bold">Step 1: Open Chrome Flag Settings in a new tab</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="font-mono bg-light border px-2 py-1 rounded text-primary user-select-all" style={{ fontSize: '12px' }}>
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </span>
                </div>
              </div>
            </li>
            <li className="list-group-item d-flex justify-content-between align-items-start py-2.5">
              <div className="ms-2 me-auto">
                <div className="fw-bold">Step 2: Add this Server URL into the text box</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="font-mono bg-light border px-2 py-1 rounded text-dark fw-bold user-select-all" style={{ fontSize: '12px' }}>
                    {typeof window !== 'undefined' ? window.location.origin : 'http://192.168.20.7:3030'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-primary"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.origin);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }
                    }}
                  >
                    <i className={`ti ${copiedUrl ? 'ti-check' : 'ti-copy'} me-1`}></i>
                    {copiedUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            </li>
            <li className="list-group-item d-flex justify-content-between align-items-start py-2.5">
              <div className="ms-2 me-auto">
                <div className="fw-bold">Step 3: Change the dropdown from "Disabled" to "Enabled"</div>
                <div className="text-muted">Select <strong>Enabled</strong> in the dropdown menu next to the text box.</div>
              </div>
            </li>
            <li className="list-group-item d-flex justify-content-between align-items-start py-2.5">
              <div className="ms-2 me-auto">
                <div className="fw-bold">Step 4: Click the blue "Relaunch" button</div>
                <div className="text-muted">Chrome will restart, and your optical cable will now auto-connect on this laptop!</div>
              </div>
            </li>
          </ol>

          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
            <span className="text-muted small">
              <i className="ti ti-info-circle me-1"></i>You only need to do this <strong>once</strong> on this laptop!
            </span>
            <button
              type="button"
              className="btn btn-sm btn-primary px-3 fw-semibold"
              onClick={() => setShowInsecureHelpModal(false)}
            >
              Done / Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
