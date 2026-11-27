import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/store';
import { saveStageForUser, isStageActive } from '../../../utils/stageUtils';
import { jigService, stageManagementService, supervisorTestService, qcTestService } from '../../../services/apiServices';
import { showWarningAlert, showErrorAlert, showSuccessAlert } from '../../../utils/swal';
import { Modal } from '../../../components/CommonComponents';
import MeterBodyPrintConsole from '../stage09-meter-box-print/MeterBodyPrintConsole';
import laserWebSerialService from '../../../services/common/laserWebSerialService';
import hardwarePortLockService, { extractPortIdentifier } from '../../../services/common/hardwarePortLockService';
import unifiedHardwarePortManager from '../../../services/common/unifiedHardwarePortManager';
import HardwarePortModal from '../../../components/common/hardware/HardwarePortModal';

// SVG QR Code Generator Component for Printable NIC Labels
function QRCodeSVG({ value, size = 110 }) {
  if (!value) return null;

  const grid = Array.from({ length: 21 }, () => Array(21).fill(false));

  const fillSquare = (r, c, w, h) => {
    for (let i = r; i < r + w; i++) {
      for (let j = c; j < c + h; j++) {
        if (i >= 0 && i < 21 && j >= 0 && j < 21) grid[i][j] = true;
      }
    }
  };

  const clearSquare = (r, c, w, h) => {
    for (let i = r; i < r + w; i++) {
      for (let j = c; j < c + h; j++) {
        if (i >= 0 && i < 21 && j >= 0 && j < 21) grid[i][j] = false;
      }
    }
  };

  const addFinder = (r, c) => {
    fillSquare(r, c, 7, 7);
    clearSquare(r + 1, c + 1, 5, 5);
    fillSquare(r + 2, c + 2, 3, 3);
  };

  addFinder(0, 0);     // Top Left
  addFinder(0, 14);    // Top Right
  addFinder(14, 0);    // Bottom Left

  fillSquare(14, 14, 5, 5);
  clearSquare(15, 15, 3, 3);
  fillSquare(16, 16, 1, 1);

  for (let i = 8; i <= 12; i += 2) {
    grid[6][i] = true;
    grid[i][6] = true;
  }

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const isFinderTL = r <= 7 && c <= 7;
      const isFinderTR = r <= 7 && c >= 13;
      const isFinderBL = r >= 13 && c <= 7;
      const isAlignment = r >= 13 && c >= 13;
      const isTiming = r === 6 || c === 6;

      if (!isFinderTL && !isFinderTR && !isFinderBL && !isAlignment && !isTiming) {
        const charCode = value.charCodeAt(bitIdx % value.length);
        const bit = ((hash ^ (r * 31 + c * 17 + charCode)) % 3) === 0;
        grid[r][c] = bit;
        bitIdx++;
      }
    }
  }

  const cellSize = size / 21;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ backgroundColor: '#ffffff', borderRadius: '6px', padding: '4px' }}>
      {grid.map((row, r) =>
        row.map((isDark, c) =>
          isDark ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.15}
              height={cellSize + 0.15}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// COM Port Settings Panel Component matching Stage 9 COM Port Settings Panel
function ComPortSettingsPanel({ title, config, onChange, onClose, commChannelContent, showHeader = false }) {
  const BAUD_OPTIONS = ['110', '300', '600', '1200', '2400', '4800', '9600', '14400', '19200', '28800', '38400', '56000', '57600', '115200', '230400'];
  const DATA_BITS_OPTS = ['5', '6', '7', '8'];
  const PARITY_OPTS = ['None', 'Even', 'Odd', 'Mark', 'Space'];
  const STOP_BITS_OPTS = ['1', '1.5', '2'];
  const PARITY_ERROR_OPTS = ['(ignore)', "35 ('#')", "42 ('*')", "63 ('?')", "248 ('ø')"];

  return (
    <div className="p-1">
      {showHeader && (
        <div className="d-flex align-items-center justify-content-between mb-2.5 pb-1.5 border-bottom border-secondary-subtle">
          <span className="fw-semibold text-secondary small text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            <i className="ti ti-adjustments me-1 text-danger"></i> {title || 'USB PORT - COM PORT SETTINGS'}
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

      {/* 1. Send/Receive on Comm. Channel */}
      {commChannelContent && (
        <div className="pb-3">
          <label className="form-label fw-bold text-dark d-block" style={{ fontSize: '12px' }}>
            Send/Receive on Comm. Channel
          </label>
          {commChannelContent}
        </div>
      )}

      {/* 2. COM Port Settings */}
      <div className="fw-bold text-dark" style={{ fontSize: '12px' }}>
        COM Port Settings
      </div>
      <div className="row g-3">
        {/* Left Column: Baud Rate, Parity, Parity Error Char. */}
        <div className="col-12 col-sm-6">
          <div className="mb-2.5">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11.5px' }}>
              Baud Rate
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '12px', height: '34px' }}
              value={config.baudRate}
              onChange={(e) => onChange('baudRate', e.target.value)}
            >
              {BAUD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2.5">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11.5px' }}>
              Parity
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '12px', height: '34px' }}
              value={config.parity}
              onChange={(e) => onChange('parity', e.target.value)}
            >
              {PARITY_OPTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-1">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11.5px' }}>
              Parity Error Char.
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '12px', height: '34px' }}
              value={config.parityErrorChar}
              onChange={(e) => onChange('parityErrorChar', e.target.value)}
            >
              {PARITY_ERROR_OPTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Data Bits, Stop Bits */}
        <div className="col-12 col-sm-6">
          <div className="mb-2.5">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11.5px' }}>
              Data Bits
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '12px', height: '34px' }}
              value={config.dataBits}
              onChange={(e) => onChange('dataBits', e.target.value)}
            >
              {DATA_BITS_OPTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2.5">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: '11.5px' }}>
              Stop Bits
            </label>
            <select
              className="form-select form-select-sm bg-white border-secondary-subtle"
              style={{ fontSize: '12px', height: '34px' }}
              value={config.stopBits}
              onChange={(e) => onChange('stopBits', e.target.value)}
            >
              {STOP_BITS_OPTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StageExecution({ isDemo: propIsDemo, stageId: propStageId }) {
  const navigate = useNavigate();
  const { user, setSelectedStageId } = useAuth();
  const { stageId: paramStageId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryStage = searchParams.get('stage');

  const isDemoMode = Boolean(
    propIsDemo ||
    location.pathname.includes('/demo') ||
    location.pathname.includes('demo-test') ||
    searchParams.get('mode') === 'demo' ||
    searchParams.get('demo') === 'true'
  );

  let activeStageId = 4;
  if (propStageId !== undefined && propStageId !== null && !isNaN(Number(propStageId))) {
    activeStageId = Number(propStageId);
  } else if (paramStageId && !isNaN(Number(paramStageId))) {
    activeStageId = Number(paramStageId);
  } else if (paramStageId && String(paramStageId).match(/\d+/)) {
    activeStageId = Number(String(paramStageId).match(/\d+/)[0]);
  } else if (queryStage && !isNaN(Number(queryStage))) {
    activeStageId = Number(queryStage);
  } else if (user?.stage_id) {
    activeStageId = Number(user.stage_id);
  }
  const stageId = activeStageId;

  const [allStages, setAllStages] = useState([]);

  // Fetch stages dynamically from database
  useEffect(() => {
    stageManagementService.getStages().then(res => {
      const list = Array.isArray(res) ? res : (res?.stages || res?.data || []);
      setAllStages(list);
    }).catch(err => console.error('Error fetching stages in StageExecution:', err));
  }, []);

  const currentStageMeta = allStages.find(s => Number(s.stage_number || s.id) === Number(stageId));
  const isStageInactive = Boolean(currentStageMeta && !isStageActive(currentStageMeta));

  useEffect(() => {
    if (allStages.length > 0 && isStageInactive) {
      showWarningAlert(
        'Stage Inactive',
        `Stage #${stageId} (${currentStageMeta?.stage_name || ''}) is currently deactivated. Inactive stages cannot be accessed or operated.`
      );
      navigate('/dashboard', { replace: true });
    }
  }, [allStages, isStageInactive, stageId, currentStageMeta, navigate]);

  // Automatically persist selected stage for user account
  useEffect(() => {
    if (user && stageId && !isStageInactive) {
      saveStageForUser(user, stageId);
      if (setSelectedStageId) {
        setSelectedStageId(stageId);
      }
    }
  }, [user, stageId, isStageInactive, setSelectedStageId]);

  // Stage Work Forms / Work Orders State for Operator
  const [activeWorkForm, setActiveWorkForm] = useState(null);
  const [operatorWorkForms, setOperatorWorkForms] = useState([]);

  const loadActiveWorkForm = async () => {
    try {
      const res = await stageManagementService.getForms({ stage_number: stageId || 4 });
      const forms = Array.isArray(res) ? res : (res?.forms || res?.data || []);

      if (forms && forms.length > 0) {
        // Find assigned active work form
        const assigned = forms.find(f =>
          Boolean(f.assigned_operator_id) &&
          f.status !== 'DE-ACTIVE' &&
          f.status !== 'COMPLETED'
        ) || forms.find(f => f.status !== 'DE-ACTIVE' && f.status !== 'COMPLETED') || forms[0];

        setActiveWorkForm(assigned || null);
        setOperatorWorkForms(forms);
      } else {
        setActiveWorkForm(null);
      }
    } catch (err) {
      console.warn('[Stage04] Error loading work forms:', err.message);
    }
  };

  useEffect(() => {
    loadActiveWorkForm();
    const interval = setInterval(loadActiveWorkForm, 10000);
    return () => clearInterval(interval);
  }, [stageId, user]);


  // Stage 6 Calibration State & Telemetry Simulation
  const [stage6Testing, setStage6Testing] = useState(false);
  const [stage6Saved, setStage6Saved] = useState(false);
  const [stage6Logs, setStage6Logs] = useState([
    '[INIT] Stage 6 AC Reference Source 230V 5.0A Connected (50.00Hz)',
    '[READY] Bench Ready. 6-Meter Calibration Position Telemetry Active.'
  ]);
  const [stage6Meters, setStage6Meters] = useState([
    { pos: 1, serial_no: 'ZM-MTR-6001', voltage: 230.12, current: 5.002, power: 1150.8, pulse_rate: 1600, error_pct: 0.07, error_lock: 'NO LOCK', status: 'PASS' },
    { pos: 2, serial_no: 'ZM-MTR-6002', voltage: 229.98, current: 4.998, power: 1149.4, pulse_rate: 1600, error_pct: -0.05, error_lock: 'NO LOCK', status: 'PASS' },
    { pos: 3, serial_no: 'ZM-MTR-6003', voltage: 230.05, current: 5.001, power: 1150.2, pulse_rate: 1600, error_pct: 0.03, error_lock: 'NO LOCK', status: 'PASS' },
    { pos: 4, serial_no: 'ZM-MTR-6004', voltage: 230.22, current: 5.003, power: 1151.7, pulse_rate: 1600, error_pct: 0.11, error_lock: 'NO LOCK', status: 'PASS' },
    { pos: 5, serial_no: 'ZM-MTR-6005', voltage: 229.89, current: 4.997, power: 1148.8, pulse_rate: 1600, error_pct: -0.09, error_lock: 'NO LOCK', status: 'PASS' },
    { pos: 6, serial_no: 'ZM-MTR-6006', voltage: 230.08, current: 5.002, power: 1150.5, pulse_rate: 1600, error_pct: 0.04, error_lock: 'NO LOCK', status: 'PASS' }
  ]);

  const handleStartStage6Test = () => {
    setStage6Testing(true);
    setStage6Saved(false);
    const nowStr = new Date().toLocaleTimeString();
    setStage6Logs(prev => [
      ...prev,
      `[${nowStr}] INJECTING REFERENCE 230V 5A POWER SOURCE...`,
      `[${nowStr}] SAMPLING PULSE IMPULSES (1600 imp/kWh)...`,
      `[${nowStr}] CALCULATING VOLTAGE & CURRENT ERRORS...`
    ]);

    setTimeout(() => {
      const updated = stage6Meters.map(m => {
        const randErr = parseFloat(((Math.random() * 0.24) - 0.10).toFixed(2));
        const isPass = Math.abs(randErr) <= 0.20;
        return {
          ...m,
          voltage: parseFloat((230 + (Math.random() * 0.4 - 0.2)).toFixed(2)),
          current: parseFloat((5 + (Math.random() * 0.01 - 0.005)).toFixed(3)),
          error_pct: randErr,
          error_lock: isPass ? 'NO LOCK' : 'ACTIVE LOCK',
          status: isPass ? 'PASS' : 'FAIL'
        };
      });
      setStage6Meters(updated);
      setStage6Testing(false);
      setStage6Logs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] CALIBRATION TEST COMPLETED. ALL METER POSITIONS MEASURED.`
      ]);
    }, 1200);
  };

  const handleSaveStage6ToDb = () => {
    setStage6Saved(true);
    setStage6Logs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [DB] STAGE 6 CALIBRATION RESULTS SAVED TO DATABASE.`
    ]);
  };

  const handleResetStage6 = () => {
    setStage6Testing(false);
    setStage6Saved(false);
    setStage6Logs(['[INIT] Stage 6 AC Reference Source 230V 5.0A Connected (50.00Hz)']);
  };

  const handleExportStage6Excel = () => {
    let csv = "\uFEFFPosition,Meter Serial,Voltage (V),Current (A),Power (W),Pulse Rate,Error (%),Error Lock,Status\n";
    stage6Meters.forEach(m => {
      csv += `${m.pos},${m.serial_no},${m.voltage},${m.current},${m.power},${m.pulse_rate},${m.error_pct}%,${m.error_lock},${m.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage6_Calibration_Report_${Date.now()}.csv`;
    link.click();
  };

  // Protocol & Connection Workflow State Management
  const [testState, setTestState] = useState('IDLE');

  // 8-Channel Live Telemetry & Log State
  const [jigLogs, setJigLogs] = useState([]);
  const [jigData, setJigData] = useState(null);

  // DB Save, Test Cycle ID & Unique NIC UUID State
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [cycleId, setCycleId] = useState(null);
  const [cycleUuid, setCycleUuid] = useState(null);
  const [saveTimestamp, setSaveTimestamp] = useState(null);
  const [savedCount, setSavedCount] = useState(0);

  // Printable QR Modal & Log Console Toggle (Hidden by default)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showLogsConsole, setShowLogsConsole] = useState(false);

  // QR Validation Scanner Input State & Ref Array
  const [scannedValues, setScannedValues] = useState({});
  const [validationStatus, setValidationStatus] = useState({});
  const qrInputRefs = useRef([]);

  // Auto-focus 1st valid channel input field when QR Validation modal opens
  useEffect(() => {
    if (isQrModalOpen) {
      const timer = setTimeout(() => {
        if (qrInputRefs.current && qrInputRefs.current[0]) {
          qrInputRefs.current[0].focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isQrModalOpen]);

  // Handler for QR Scanner Input Box
  const handleScanInput = (chNo, idx, c, value) => {
    setScannedValues(prev => ({ ...prev, [chNo]: value }));
    const trimmed = value.trim();

    if (!trimmed) {
      setValidationStatus(prev => ({ ...prev, [chNo]: null }));
      return;
    }

    let scannedImei = trimmed;
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        scannedImei = String(parsed.imei_no || parsed.imei || trimmed).trim();
      }
    } catch (e) { }

    const targetImei = String(c.imei || '').trim();
    const isMatch = scannedImei === targetImei || trimmed.includes(targetImei);

    if (isMatch) {
      setValidationStatus(prev => ({ ...prev, [chNo]: 'MATCHED' }));
      // Automatically advance mouse cursor to next channel input field on match!
      setTimeout(() => {
        if (qrInputRefs.current && qrInputRefs.current[idx + 1]) {
          qrInputRefs.current[idx + 1].focus();
        }
      }, 100);
    } else {
      setValidationStatus(prev => ({ ...prev, [chNo]: 'MISMATCH' }));
    }
  };

  const handleScanKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move mouse cursor to next channel input field on Enter key
      if (qrInputRefs.current && qrInputRefs.current[idx + 1]) {
        qrInputRefs.current[idx + 1].focus();
      }
    }
  };

  // Duplicate IMEI & Manual Edit State
  const [dbDuplicates, setDbDuplicates] = useState([]);
  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editFormData, setEditFormData] = useState({ imei: '', hwv: 'v1.2', fwv: 'v2.0', sig: '-65dBm', comms_technology: '12' });
  const [printedChannels, setPrintedChannels] = useState({});

  // USB Serial Hardware Connection State
  const currentOperatorId = user?.employee_id || user?.id || 'OPERATOR-04';
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbDeviceName, setUsbDeviceName] = useState('');
  const [availablePorts, setAvailablePorts] = useState([]);
  const [detailedPorts, setDetailedPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [activePortLocks, setActivePortLocks] = useState(() => hardwarePortLockService.getStoredLocks());
  const [jigPortOptions, setJigPortOptions] = useState([]);
  const [laserPortOptions, setLaserPortOptions] = useState([]);

  // COM Port Settings Panel State & Persistence
  const [showReceiveSettings, setShowReceiveSettings] = useState(false);
  const [isConnectingPort, setIsConnectingPort] = useState(false);
  const [jigSerialConfig, setJigSerialConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('zenmeter_jig_config_stage4');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
      baudRate: '9600',
      dataBits: '8',
      parity: 'None',
      stopBits: '1',
      parityErrorChar: "63 ('?')"
    };
  });

  const updateJigConfig = (key, value) => {
    setJigSerialConfig(prev => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('zenmeter_jig_config_stage4', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });
  };

  // Laser Port State & Persistence
  const [laserConnected, setLaserConnected] = useState(false);
  const [laserDeviceName, setLaserDeviceName] = useState('');
  const [selectedLaserPort, setSelectedLaserPort] = useState('');
  const [showLaserSettings, setShowLaserSettings] = useState(false);
  const [isConnectingLaserPort, setIsConnectingLaserPort] = useState(false);
  const [laserSerialConfig, setLaserSerialConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('zenmeter_laser_config_stage4');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
      baudRate: '9600',
      dataBits: '8',
      parity: 'None',
      stopBits: '1',
      parityErrorChar: "63 ('?')"
    };
  });

  const updateLaserConfig = (key, value) => {
    setLaserSerialConfig(prev => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('zenmeter_laser_config_stage4', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });
  };

  useEffect(() => {
    setActivePortLocks(hardwarePortLockService.getStoredLocks());
    return hardwarePortLockService.subscribe((locks) => {
      setActivePortLocks({ ...locks });
    });
  }, []);

  const refreshHardwarePortOptions = async () => {
    try {
      const jList = await unifiedHardwarePortManager.getAvailablePorts('jig', 4, laserConnected ? selectedLaserPort : null, usbConnected ? selectedPort : null);
      setJigPortOptions(jList);
      const lList = await unifiedHardwarePortManager.getAvailablePorts('laser', 4, usbConnected ? selectedPort : null, laserConnected ? selectedLaserPort : null);
      setLaserPortOptions(lList);
    } catch (_) { }
  };

  useEffect(() => {
    refreshHardwarePortOptions();
    const unsub = unifiedHardwarePortManager.setupHardwareListeners(() => {
      refreshHardwarePortOptions();
    });
    return () => unsub();
  }, [usbConnected, selectedPort, laserConnected, selectedLaserPort, activePortLocks]);

  useEffect(() => {
    if (usbConnected) return;
    const valid = jigPortOptions.filter(o => !o.isTaken);
    const matches = valid.some(o => o.value === selectedPort);
    if (!matches && valid.length > 0) {
      setSelectedPort(valid[0].value);
    } else if (valid.length === 0) {
      setSelectedPort('');
    }
  }, [jigPortOptions, selectedPort, usbConnected]);

  useEffect(() => {
    if (laserConnected) return;
    const valid = laserPortOptions.filter(o => !o.isTaken);
    const matches = valid.some(o => o.value === selectedLaserPort);
    if (!matches && valid.length > 0) {
      setSelectedLaserPort(valid[0].value);
    } else if (valid.length === 0) {
      setSelectedLaserPort('');
    }
  }, [laserPortOptions, selectedLaserPort, laserConnected]);

  const wsRef = useRef(null);
  const nonUsbPattern = /(bluetooth|blth|buds|airpods|incoming-port|rfcomm|debug-console)/i;

  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const formatTimestamp = () => {
    const d = new Date();
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };

  // Format COM port string clean (e.g. "COM3 (STMicroelectronics)" -> "COM3")
  const formatPortName = (p) => {
    if (!p) return '';
    return String(p).replace(/\s*\([^)]*\)/g, '').trim();
  };

  const appendLog = (logText) => {
    setJigLogs(prev => [...prev, logText]);
  };

  // Generator for 8-channel realistic simulated demo telemetry
  const generateDemoTelemetry = (customCycleId) => {
    const cId = customCycleId || Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const uuid = `DEMO-CYC-${cId}`;
    const timestampStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    // Generate 8 realistic channels with valid NIC data matching domain IMEI sequence (863906069415294 - 863906069415301)
    const baseImei = 863906069415293;
    const sigLevels = ['-65dBm', '-62dBm', '-68dBm', '-63dBm', '-60dBm', '-66dBm', '-64dBm', '-67dBm'];
    const channels = Array.from({ length: 8 }, (_, idx) => {
      const chNo = idx + 1;
      const imei = String(baseImei + chNo);
      return {
        ch: chNo,
        st: 'PASS',
        imei: imei,
        hwv: 'v1.2',
        fwv: 'v2.0',
        sig: sigLevels[idx] || '-65dBm',
        nic_uuid: `NIC-ZM-${imei}`,
        comms_technology: '12',
        isSavedToDb: true
      };
    });

    const logs = [
      `[${timestampStr}] [DEMO INIT] - Stage 4 Jig Test Console Demo Simulation Engine Initialized.`,
      `[${timestampStr}] [DEMO PORT] - Virtual USB Emulation connected on DEMO-PORT-01 (9600 8N1).`,
      `[${timestampStr}] [TX] - START`,
      `[${timestampStr}] [RX] - ACK (JIG READY)`,
      `[${timestampStr}] [TX] - GET_DATA`,
      `[${timestampStr}] [RX] - 8-Channel Telemetry Packets Received.`,
      `[${timestampStr}] [DB] - 8 Valid Channel Records Synced with DB. Cycle: ${uuid} (#${cId}).`
    ];

    return {
      cycleId: cId,
      cycleUuid: uuid,
      timestamp: timestampStr,
      data: { ch: channels },
      logs: logs
    };
  };

  // In Demo Mode on mount: configure virtual Optical Port, but keep channel data empty until "Start Demo Test" is clicked!
  useEffect(() => {
    if (isDemoMode) {
      setUsbConnected(true);
      setUsbDeviceName('DEMO-USB-PORT');
      setSelectedPort('DEMO-PORT-01');
      setDetailedPorts([
        { path: 'DEMO-PORT-01', friendlyName: 'DEMO-PORT-01 (Virtual Jig USB)', shortName: 'DEMO-PORT-01' },
        { path: 'DEMO-PORT-02', friendlyName: 'DEMO-PORT-02 (Loopback Simulator)', shortName: 'DEMO-PORT-02' }
      ]);
      setAvailablePorts(['DEMO-PORT-01', 'DEMO-PORT-02']);
      setJigData(null);
      setJigLogs([]);
      setCycleId(null);
      setCycleUuid(null);
      setSaveTimestamp(null);
      setIsSavedToDb(false);
      setSavedCount(0);
      setTestState('IDLE');
    }
  }, [isDemoMode]);

  // Laser / Thermal Printer JSON Payload Modal State & API Dispatch Handler
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSendingPrintApi, setIsSendingPrintApi] = useState(false);
  const [printApiResponse, setPrintApiResponse] = useState(null);

  const handleOpenPrintModal = () => {
    setPrintApiResponse(null);
    setIsPrintModalOpen(true);
  };

  const handleSendPrintApi = async () => {
    setIsSendingPrintApi(true);
    setPrintApiResponse(null);

    const validChannels = activeChannels.filter(c => c.imei && (c.st === 'PASS' || c.st === 'CON'));
    const payload = {
      meter_no: 'NIC_JIG_STAGE_4',
      stage_id: 4,
      cycle_id: cycleId || 101,
      cycle_uuid: cycleUuid || 'DEMO-CYC-101',
      operator_id: user?.employee_id || 'ZMRD004',
      channels: validChannels.map((c, idx) => ({
        s_no: idx + 1,
        imei_no: String(c.imei || '').trim(),
        comms_technology: String(c.comms_technology || '12')
      }))
    };

    try {
      let res;
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 600));
        res = {
          success: true,
          status: 200,
          message: `Laser & Thermal Marking Engine received ${payload.channels.length} channel label payloads successfully.`,
          timestamp: new Date().toISOString(),
          dispatched_count: payload.channels.length,
          cycle_uuid: payload.cycle_uuid,
          printer_status: 'ONLINE (Ready)',
          channels: payload.channels
        };
      } else {
        res = await jigService.sendPrintPayload(payload);
      }

      setPrintApiResponse(res);
      const updatedPrinted = { ...printedChannels };
      validChannels.forEach(c => {
        updatedPrinted[c.ch] = true;
      });
      setPrintedChannels(updatedPrinted);
      appendLog(`[${new Date().toLocaleTimeString()}] [PRINT API] - Print payload for ${payload.channels.length} channels dispatched successfully.`);
    } catch (err) {
      setPrintApiResponse({
        success: false,
        error: err.message || 'Failed to dispatch print API request'
      });
    } finally {
      setIsSendingPrintApi(false);
    }
  };

  // Connect USB COM Port on backend & persist
  const handleConnectJigPort = async (portToConnect = selectedPort) => {
    const target = portToConnect || (jigPortOptions.find(o => !o.isTaken)?.value);
    if (!target) {
      showWarningAlert('No Port Selected', 'Please select a COM port to connect.');
      return;
    }
    const lockCheck = hardwarePortLockService.checkLock(target, 4);
    if (lockCheck.isLocked) {
      showErrorAlert('Port Unavailable', lockCheck.message || 'This COM port is already in use by another stage.');
      return;
    }
    setIsConnectingPort(true);
    try {
      if (isDemoMode) {
        setUsbConnected(true);
        setUsbDeviceName(target);
        setSelectedPort(target);
        hardwarePortLockService.claimLock(target, { stageId: 4, stageName: 'Stage 4', portType: 'NIC Receive Port' });
        setTestState(prev => (prev === 'IDLE' || prev === 'USB_SCANNING') ? 'USB_CONNECTED' : prev);
        setShowReceiveSettings(false);
        return;
      }

      let connectedSuccessfully = false;
      let connectedDisplayName = target;

      if (unifiedHardwarePortManager.isSupported()) {
        try {
          const res = await unifiedHardwarePortManager.connectPort({
            role: 'jig',
            portName: target,
            stageId: 4,
            stageName: 'Stage 4',
            portType: 'NIC Receive Port',
            config: jigSerialConfig,
            operatorId: currentOperatorId
          });
          if (res && res.portName) {
            connectedDisplayName = res.portName;
            connectedSuccessfully = true;
          }
        } catch (webSerialErr) {
          console.warn('[Stage4] WebSerial connect attempt note:', webSerialErr.message);
        }
      }

      if (!connectedSuccessfully) {
        const res = await jigService.connectHardware({
          path: target,
          baudRate: jigSerialConfig.baudRate,
          dataBits: jigSerialConfig.dataBits,
          parity: jigSerialConfig.parity.toLowerCase(),
          stopBits: jigSerialConfig.stopBits
        });

        if (res.success && res.data && res.data.connected) {
          connectedSuccessfully = true;
          connectedDisplayName = res.data.device || res.data.details?.friendlyName || target;
          hardwarePortLockService.claimLock(target, { stageId: 4, stageName: 'Stage 4', portType: 'NIC Receive Port' });
          try {
            localStorage.setItem('zenmeter_jig_was_connected', 'true');
            localStorage.setItem('zenmeter_jig_last_port', target);
            localStorage.setItem('zenmeter_jig_manual_disconnect', 'false');
          } catch (_) { }
        } else {
          showErrorAlert('Connection Failed', res.message || res.data?.error?.message || 'Could not connect to selected COM port.');
          setUsbConnected(false);
          return;
        }
      }

      setUsbConnected(true);
      setUsbDeviceName(connectedDisplayName);
      setSelectedPort(connectedDisplayName);
      try {
        localStorage.setItem('zenmeter_jig_port_stage4', connectedDisplayName);
      } catch (e) { }
      setTestState(prev => (prev === 'IDLE' || prev === 'USB_SCANNING') ? 'USB_CONNECTED' : prev);
      setShowReceiveSettings(false);
      await refreshHardwarePortOptions();
    } catch (err) {
      setUsbConnected(false);
      showErrorAlert('Connection Error', err.message || 'Error connecting to COM port.');
    } finally {
      setIsConnectingPort(false);
    }
  };

  // Disconnect USB COM Port
  const handleDisconnectJigPort = async () => {
    setIsConnectingPort(true);
    try {
      if (selectedPort) {
        await unifiedHardwarePortManager.disconnectPort({ role: 'jig', portName: selectedPort });
      }
      try {
        await jigService.disconnectHardware();
      } catch (_) { }
      setUsbConnected(false);
      setUsbDeviceName('');
      try {
        localStorage.removeItem('zenmeter_jig_port_stage4');
      } catch (e) { }
      await refreshHardwarePortOptions();
    } catch (err) {
      showErrorAlert('Disconnect Error', err.message || 'Error disconnecting COM port.');
    } finally {
      setIsConnectingPort(false);
    }
  };

  // Pair from Windows Device Manager via browser Web Serial API dialog
  const handlePairDeviceManagerPort = async () => {
    try {
      const paired = await unifiedHardwarePortManager.pairNewPort('jig');
      if (paired) {
        setSelectedPort(paired.friendlyName);
        await refreshHardwarePortOptions();
      }
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        showErrorAlert('Port Pair Error', e.message);
      }
    }
  };

  // Connect Laser Port
  const handleConnectLaserPort = async (portToConnect = selectedLaserPort) => {
    const target = portToConnect || (laserPortOptions.find(o => !o.isTaken)?.value);
    if (!target) {
      showWarningAlert('No Port Selected', 'Please select a Laser COM port to connect.');
      return;
    }
    const lockCheck = hardwarePortLockService.checkLock(target, 4);
    if (lockCheck.isLocked) {
      showErrorAlert('Port Unavailable', lockCheck.message || 'This COM port is already in use by another stage.');
      return;
    }
    setIsConnectingLaserPort(true);
    try {
      if (isDemoMode) {
        setLaserConnected(true);
        setLaserDeviceName(target);
        setSelectedLaserPort(target);
        hardwarePortLockService.claimLock(target, { stageId: 4, stageName: 'Stage 4', portType: 'Laser Port' });
        setShowLaserSettings(false);
        return;
      }

      const res = await unifiedHardwarePortManager.connectPort({
        role: 'laser',
        portName: target,
        stageId: 4,
        stageName: 'Stage 4',
        portType: 'Laser Port',
        config: laserSerialConfig,
        operatorId: currentOperatorId
      });

      const finalName = res.portName || target;
      setLaserConnected(true);
      setLaserDeviceName(finalName);
      setSelectedLaserPort(finalName);
      try {
        localStorage.setItem('zenmeter_laser_port_stage4', finalName);
      } catch (e) { }
      setShowLaserSettings(false);
      await refreshHardwarePortOptions();
    } catch (err) {
      setLaserConnected(false);
      showErrorAlert('Laser Connect Error', err.message || 'Error connecting to Laser COM port.');
    } finally {
      setIsConnectingLaserPort(false);
    }
  };

  // Disconnect Laser Port
  const handleDisconnectLaserPort = async () => {
    setIsConnectingLaserPort(true);
    try {
      if (selectedLaserPort) {
        await unifiedHardwarePortManager.disconnectPort({ role: 'laser', portName: selectedLaserPort });
      }
      setLaserConnected(false);
      setLaserDeviceName('');
      try {
        localStorage.removeItem('zenmeter_laser_port_stage4');
      } catch (e) { }
      await refreshHardwarePortOptions();
    } catch (err) {
      showErrorAlert('Disconnect Error', err.message || 'Error disconnecting Laser COM port.');
    } finally {
      setIsConnectingLaserPort(false);
    }
  };

  // Pair Laser Port from Windows Device Manager
  const handlePairLaserDeviceManagerPort = async () => {
    try {
      const paired = await unifiedHardwarePortManager.pairNewPort('laser');
      if (paired) {
        setSelectedLaserPort(paired.friendlyName);
        await refreshHardwarePortOptions();
      }
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        showErrorAlert('Laser Pair Error', e.message);
      }
    }
  };

  // 1. Fetch available Optical Ports from Node.js backend
  const fetchAvailableUsbPorts = async () => {
    if (stageId === 9 || Number(stageId) === 9) return;
    if (isDemoMode) {
      setAvailablePorts(['DEMO-PORT-01', 'DEMO-PORT-02']);
      setDetailedPorts([
        { path: 'DEMO-PORT-01', friendlyName: 'DEMO-PORT-01 (Virtual Jig USB)', shortName: 'DEMO-PORT-01' },
        { path: 'DEMO-PORT-02', friendlyName: 'DEMO-PORT-02 (Loopback Simulator)', shortName: 'DEMO-PORT-02' }
      ]);
      setSelectedPort('DEMO-PORT-01');
      return;
    }
    await refreshHardwarePortOptions();
  };

  // Query hardware port status on mount - strict persistence across reloads
  useEffect(() => {
    if (isDemoMode) return;

    let isMounted = true;
    const checkInitialPortStatus = async () => {
      try {
        // 1. Auto-reconnect WebSerial ports across reloads (F5) without disconnecting
        if (unifiedHardwarePortManager.isSupported()) {
          const restoredJig = await unifiedHardwarePortManager.restorePortOnMount({
            role: 'jig',
            stageId: 4,
            stageName: 'Stage 4',
            portType: 'NIC Receive Port',
            config: jigSerialConfig,
            operatorId: currentOperatorId
          });
          if (restoredJig && isMounted) {
            setUsbConnected(true);
            setSelectedPort(restoredJig.portName);
            setUsbDeviceName(restoredJig.portName);
            setTestState(prev => (prev === 'IDLE' || prev === 'USB_SCANNING') ? 'USB_CONNECTED' : prev);
          }

          const restoredLaser = await unifiedHardwarePortManager.restorePortOnMount({
            role: 'laser',
            stageId: 4,
            stageName: 'Stage 4',
            portType: 'Laser Port',
            config: laserSerialConfig,
            operatorId: currentOperatorId
          });
          if (restoredLaser && isMounted) {
            setLaserConnected(true);
            setSelectedLaserPort(restoredLaser.portName);
            setLaserDeviceName(restoredLaser.portName);
          }
        }

        // 2. Also check if backend is already connected
        const statusRes = await jigService.getJigStatus();
        if (isMounted && statusRes && statusRes.success && statusRes.data && statusRes.data.connected) {
          const activePort = statusRes.data.port;
          const activeName = statusRes.data.device || statusRes.data.details?.friendlyName || activePort;
          setUsbConnected(true);
          setSelectedPort(activePort);
          setUsbDeviceName(activeName);
          setTestState(prev => (prev === 'IDLE' || prev === 'USB_SCANNING') ? 'USB_CONNECTED' : prev);
        }

        await refreshHardwarePortOptions();

        // 3. Setup real-time unplug watcher
        if (unifiedHardwarePortManager.isSupported()) {
          unifiedHardwarePortManager.setupDisconnectWatcher({
            onDisconnect: (role) => {
              if (role === 'laser' && isMounted) {
                setLaserConnected(false);
                setLaserDeviceName('');
                refreshHardwarePortOptions();
              } else if (isMounted) {
                setUsbConnected(false);
                setUsbDeviceName('');
                setTestState('IDLE');
                refreshHardwarePortOptions();
              }
            }
          });
        }
      } catch (err) {
        console.warn('[Stage4] Initial port check notice:', err.message);
      }
    };

    checkInitialPortStatus();
    return () => { isMounted = false; };
  }, [isDemoMode]);

  // Check duplicate IMEIs in DB
  const checkDbDuplicates = async (channelsList) => {
    const imeis = (channelsList || []).map(c => c.imei).filter(Boolean);
    if (imeis.length === 0) {
      setDbDuplicates([]);
      return;
    }
    try {
      const res = await jigService.checkDuplicateImeis({ imeis });
      if (res.success && Array.isArray(res.duplicates)) {
        setDbDuplicates(res.duplicates);
      }
    } catch (e) {
      console.warn('[Frontend] Duplicate IMEI check notice:', e);
    }
  };

  // Connect WebSocket gateway for real-time live updates
  useEffect(() => {
    if (stageId === 9 || Number(stageId) === 9) return;
    fetchAvailableUsbPorts();

    const host = window.location.hostname || 'localhost';
    const envWs = import.meta?.env?.VITE_WS_URL;
    let wsUrl = `ws://${host}:5555/ws`;
    if (envWs) {
      wsUrl = envWs.endsWith('/ws') ? envWs : `${envWs.replace(/\/$/, '')}/ws`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to Zenmeter Realtime Gateway');
      };

      ws.onmessage = (evt) => {
        try {
          const message = JSON.parse(evt.data);
          const { event, data } = message;

          if (event === 'jig.usb.connected') {
            setUsbConnected(true);
            setUsbDeviceName(data?.port || selectedPort);
            setTestState('USB_CONNECTED');
          } else if (event === 'jig.usb.disconnected') {
            setUsbConnected(false);
            setUsbDeviceName('');
            setTestState('IDLE');
          } else if (event === 'jig.test.started') {
            setTestState('STARTING');
          } else if (event === 'jig.ack.received') {
            setTestState('ACK_RECEIVED');
          } else if (event === 'jig.data.received') {
            if (data && data.ch) {
              setJigData(data);
              setTestState('DATA_RECEIVED');
              checkDbDuplicates(data.ch);
            }
          } else if (event === 'jig.error') {
            const errCode = data?.code || 'JIG-ERR-001';
            const errMsg = data?.message || 'Jig hardware error';
            appendLog(`${formatTimestamp()} [ERR] - ${errCode}: ${errMsg}`);
            setTestState('ERROR');
            showErrorAlert(`Hardware Error (${errCode})`, errMsg);
          }
        } catch (e) { }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Warning:', err);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Closed');
      };
    } catch (e) { }

    const intervalId = setInterval(fetchAvailableUsbPorts, 2000);

    return () => {
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stageId]);

  // Whenever jigData changes, trigger duplicate checking
  useEffect(() => {
    if (jigData && jigData.ch) {
      checkDbDuplicates(jigData.ch);
    }
  }, [jigData]);

  // Default 8-Channel initial state
  const defaultChannels = Array.from({ length: 8 }, (_, i) => ({
    ch: i + 1,
    st: 'NCON',
    imei: null,
    hwv: null,
    fwv: null,
    sig: null,
    nic_uuid: null,
    comms_technology: '12'
  }));

  const activeChannels = jigData?.ch || defaultChannels;

  // Channel classification helper
  const getChannelClassification = (c) => {
    const imeiStr = c.imei ? String(c.imei).trim() : null;
    const isDbDup = Boolean(imeiStr && dbDuplicates.includes(imeiStr));

    const sameImeiCount = imeiStr ? activeChannels.filter(ch => ch.imei && String(ch.imei).trim() === imeiStr).length : 0;
    const isBatchDup = imeiStr ? sameImeiCount > 1 : false;

    const isDuplicate = isDbDup || isBatchDup;
    const isValid = Boolean(imeiStr) && !isDuplicate && (c.st === 'PASS' || c.st === 'CON');

    return {
      isDbDup,
      isBatchDup,
      isDuplicate,
      isValid
    };
  };

  const handlePortSelectChange = (newPort) => {
    setSelectedPort(newPort);
    if (newPort) {
      autoConnectPort(newPort);
    }
  };

  // Helper to save telemetry data to DB (Saves ONLY valid, non-duplicate, non-null channels cleanly)
  const autoSaveJigDataToDb = async (dataToSave) => {
    if (!dataToSave || !dataToSave.ch) return;

    const currentChs = dataToSave.ch;
    const validChannelsToSave = currentChs.filter(c => {
      const cls = getChannelClassification(c);
      return cls.isValid;
    });

    if (validChannelsToSave.length === 0) {
      showWarningAlert(
        'No New Valid Channels',
        'No valid new NIC channels available to save. Duplicate IMEIs (orange) and Null/Error data (red) were automatically prevented from saving to DB.'
      );
      return;
    }

    setTestState('SAVING');
    try {
      const payloadData = {
        ...dataToSave,
        ch: validChannelsToSave
      };

      const res = await jigService.saveJigDataToDb({
        meter_no: 'NIC_JIG_STAGE_4',
        stage_id: stageId,
        jig_data: payloadData,
        operator_id: user?.employee_id || user?.user_name || user?.id || user?.name || 'OPERATOR'
      });

      if (res.success) {
        const returnedCycleId = res.cycle_id || 1;
        const returnedCycleUuid = res.cycle_uuid || `ZMRJIG${String(returnedCycleId).padStart(4, '0')}`;
        const savedCardsCount = res.saved_channels || 0;
        const returnedNicCards = res.nic_cards || [];

        // Update local channels state with assigned nic_uuid for saved cards
        const updatedChannels = currentChs.map(c => {
          const match = returnedNicCards.find(n => n.channel === c.ch);
          if (match) {
            return { ...c, nic_uuid: match.nic_uuid, isSavedToDb: true };
          }
          return c;
        });

        setJigData(prev => ({
          ...prev,
          cycle_id: returnedCycleId,
          cycle_uuid: returnedCycleUuid,
          ch: updatedChannels
        }));

        const nowTimestamp = formatTimestamp();
        setIsSavedToDb(true);
        setCycleId(returnedCycleId);
        setCycleUuid(returnedCycleUuid);
        setSaveTimestamp(nowTimestamp);
        setSavedCount(savedCardsCount);
        setTestState('SAVED');

        checkDbDuplicates(updatedChannels);
        // Note: No modal popup alert shown here to keep view uncluttered as requested!
      } else {
        setTestState('DATA_RECEIVED');
      }
    } catch (err) {
      console.error('[Frontend] Auto save notice:', err);
      setTestState('DATA_RECEIVED');
      showErrorAlert('Database Save Error', err.message || 'Error saving telemetry to database.');
    }
  };

  // Start Hardware Test Protocol
  const handleJigStart = async () => {
    if (isDemoMode) {
      setTestState('STARTING');
      setIsSavedToDb(false);
      setPrintedChannels({});

      const now = new Date();
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

      appendLog(`[${timeStr}] [TX] - START (DEMO PROTOCOL INITIATED)`);

      setTimeout(() => {
        appendLog(`[${timeStr}] [RX] - ACK (DEMO PROTOCOL CONFIRMED)`);
        appendLog(`[${timeStr}] [TX] - GET_DATA`);

        setTimeout(() => {
          const freshDemo = generateDemoTelemetry();
          setJigData(freshDemo.data);
          setCycleId(freshDemo.cycleId);
          setCycleUuid(freshDemo.cycleUuid);
          setSaveTimestamp(freshDemo.timestamp);
          setIsSavedToDb(true);
          setSavedCount(8);
          setTestState('DATA_RECEIVED');
          freshDemo.logs.forEach(l => appendLog(l));
        }, 600);
      }, 500);

      return;
    }

    if (!usbConnected) {
      showWarningAlert('USB Removed / Disconnected', 'Please plug in a USB cable / Type-C device before starting Jig test.');
      return;
    }

    setTestState('STARTING');
    setIsSavedToDb(false);
    setCycleId(null);
    setCycleUuid(null);
    setSaveTimestamp(null);
    setSavedCount(0);
    setJigLogs([]);
    setJigData(null);
    setDbDuplicates([]);
    setPrintedChannels({});

    try {
      const res = await jigService.startHardwareTest({
        meter_no: 'NIC_JIG_STAGE_4',
        stage_id: stageId
      });

      if (res.success) {
        setJigLogs(res.logs || []);
        if (res.data) {
          setJigData(res.data);
          setTestState('DATA_RECEIVED');
          checkDbDuplicates(res.data.ch);
          // Automatically save ONLY correct, new, non-duplicate data to DB
          await autoSaveJigDataToDb(res.data);
        }
      } else {
        const errObj = res.error || {};
        const errCode = errObj.code || 'JIG-START-001';
        const errMsg = errObj.message || 'Hardware test failed.';
        appendLog(`${formatTimestamp()} [ERR] - ${errCode}: ${errMsg}`);
        setTestState('ERROR');
        showErrorAlert(`Hardware Test Failed (${errCode})`, errMsg);
      }
    } catch (err) {
      const errCode = err.code || 'JIG-START-001';
      const errMsg = err.message || 'Hardware communication error.';
      appendLog(`${formatTimestamp()} [ERR] - ${errCode}: ${errMsg}`);
      setTestState('ERROR');
      showErrorAlert(`Hardware Protocol Error (${errCode})`, errMsg);
    }
  };

  // Manual Save to DB Handler
  const handleSaveJigDataToDb = async () => {
    if (!jigData || !jigData.ch) {
      showWarningAlert('No Telemetry Data', 'Please click "Start Jig test" to collect hardware data before saving.');
      return;
    }
    await autoSaveJigDataToDb(jigData);
  };

  // Manual Card Edit Handlers
  const handleStartEditCard = (c) => {
    if (editingChannelId === c.ch) {
      setEditingChannelId(null);
    } else {
      setEditingChannelId(c.ch);
      setEditFormData({
        imei: c.imei || '',
        hwv: c.hwv || 'v1.2',
        fwv: c.fwv || 'v2.0',
        sig: c.sig || '-65dBm',
        comms_technology: c.comms_technology || '12'
      });
    }
  };

  const handleUpdateChannelCard = (channelNo, andSaveDb = false) => {
    const imeiVal = editFormData.imei.trim();
    if (!imeiVal) {
      showWarningAlert('IMEI Required', 'Please enter a valid IMEI number to update this channel.');
      return;
    }

    const updatedChannels = activeChannels.map(c => {
      if (c.ch === channelNo) {
        return {
          ...c,
          st: 'PASS',
          imei: imeiVal,
          hwv: editFormData.hwv.trim() || 'v1.2',
          fwv: editFormData.fwv.trim() || 'v2.0',
          sig: editFormData.sig.trim() || '-65dBm',
          comms_technology: editFormData.comms_technology.trim() || '12'
        };
      }
      return c;
    });

    const updatedData = {
      jig: jigData?.jig || 'JIG-001',
      tc: jigData?.tc || 1,
      ch: updatedChannels
    };

    setJigData(updatedData);
    setEditingChannelId(null);
    checkDbDuplicates(updatedChannels);

    if (andSaveDb) {
      autoSaveJigDataToDb(updatedData);
    }
  };

  // Export 8-Channel Jig Results to Excel (.csv format with UTF-8 BOM)
  const handleExportToExcel = () => {
    if (!jigData || !jigData.ch) {
      showWarningAlert('No Data Available', 'Please collect hardware test data before downloading Excel.');
      return;
    }

    const now = new Date();
    const dateFormatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    let csvContent = "\uFEFF";
    csvContent += "S.No,IMEI,Telemetry JSON Payload,NIC UUID,Channel No,Hardware Version (HWV),Firmware Version (FWV),Signal Strength (SIG),Channel Status,DB Save Status,Tested At\n";

    jigData.ch.forEach((c, idx) => {
      const sno = idx + 1;
      const imeiNum = c.imei ? String(c.imei).trim() : 'N/A';
      const imeiFormatted = `"IMEI: ${imeiNum}"`;

      const payloadObj = {
        imei_no: imeiNum,
        comms_technology: c.comms_technology || "12"
      };
      const jsonPayloadStr = `"${JSON.stringify(payloadObj).replace(/"/g, '""')}"`;

      const nicUuid = c.nic_uuid ? `"${c.nic_uuid}"` : "N/A";
      const chNo = `"CH-0${c.ch}"`;
      const hwv = c.hwv ? `"${c.hwv}"` : "N/A";
      const fwv = c.fwv ? `"${c.fwv}"` : "N/A";
      const sig = c.sig ? `"${c.sig}"` : "N/A";
      const status = c.st || "NCON";
      const savedStatus = (c.nic_uuid || c.isSavedToDb || isSavedToDb) ? "SAVED_TO_DB" : "PENDING_SAVE";

      csvContent += `${sno},${imeiFormatted},${jsonPayloadStr},${nicUuid},${chNo},${hwv},${fwv},${sig},${status},${savedStatus},"${dateFormatted}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Jig_Test_NIC_Cycle_${cycleId || 'Draft'}_${now.getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Test Console
  const handleResetJigConsole = () => {
    if (isDemoMode) {
      setJigData(null);
      setJigLogs([]);
      setCycleId(null);
      setCycleUuid(null);
      setSaveTimestamp(null);
      setIsSavedToDb(false);
      setSavedCount(0);
      setDbDuplicates([]);
      setEditingChannelId(null);
      setPrintedChannels({});
      setTestState('IDLE');
      showWarningAlert('Demo Console Reset', 'Stage 4 Demo test console reset to initial idle state.');
      return;
    }
    setJigData(null);
    setJigLogs([]);
    setIsSavedToDb(false);
    setCycleId(null);
    setCycleUuid(null);
    setSaveTimestamp(null);
    setSavedCount(0);
    setDbDuplicates([]);
    setEditingChannelId(null);
    setPrintedChannels({});
    setTestState(usbConnected ? 'USB_CONNECTED' : 'IDLE');
    showWarningAlert('Console Reset', '8-Channel Jig Console state reset to initial.');
  };

  const handlePrintQrCodes = () => {
    const newPrinted = { ...printedChannels };
    activeChannels.forEach(c => {
      const cls = getChannelClassification(c);
      if (c.nic_uuid || cls.isValid) {
        newPrinted[c.ch] = true;
      }
    });
    setPrintedChannels(newPrinted);
    window.print();
  };

  // Determine button enablement
  const isStartDisabled = isDemoMode
    ? (testState === 'STARTING' || testState === 'SAVING')
    : (!usbConnected || testState === 'STARTING' || testState === 'SAVING');
  const isSaveDisabled = !jigData || !jigData.ch || testState === 'SAVING' || testState === 'SAVED' || testState === 'STARTING';
  const isExportDisabled = !isSavedToDb;

  if (allStages.length > 0 && isStageInactive) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="card border-0 shadow-sm p-5 mx-auto" style={{ maxWidth: '520px', borderRadius: '16px' }}>
          <i className="ti ti-power text-danger mb-3" style={{ fontSize: '3rem' }}></i>
          <h4 className="fw-bold text-dark">Stage #{stageId} is Inactive</h4>
          <p className="text-secondary small mb-4">
            This production stage is currently deactivated. Only active stages can be accessed or operated.
          </p>
          <button className="btn btn-primary fw-semibold px-4 py-2 rounded-3" onClick={() => navigate('/dashboard', { replace: true })}>
            <i className="ti ti-arrow-left me-1"></i> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderStage06Calibration = () => {
    return (
      <div className="container-fluid px-0 pb-4">
        {/* Top Header Card */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="ti ti-bolt text-primary"></i>
                    <span>Meter Calibration & Accuracy Console</span>
                  </h1>
                  <span className="badge text-white font-mono px-2.5 py-1 fs-6 shadow-2xs" style={{ backgroundColor: '#ff5c00' }}>
                    6-Stage
                  </span>
                  <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                    <i className="ti ti-power fs-6"></i> 230V 5A AC Power Bench Active
                  </span>
                  {stage6Saved && (
                    <span className="badge bg-success text-white px-3 py-1 font-mono shadow-2xs">
                      <i className="ti ti-database-check me-1"></i>CALIBRATION SAVED
                    </span>
                  )}
                </div>
                <p className="text-secondary mb-0 small">
                  Stage 06: Voltage, Current & Meter Pulse Calibration &bull; Inject 230V 5A Power Source &bull; Measure Pulse Error (% Limit &le; 0.20%) &bull; Error Lock Validation
                </p>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  className="btn btn-outline-secondary btn-sm font-sans fw-semibold shadow-2xs"
                  onClick={handleExportStage6Excel}
                >
                  <i className="ti ti-file-spreadsheet me-1 text-success"></i> Download Report
                </button>
                <button
                  className="btn btn-light border btn-sm font-sans fw-semibold"
                  onClick={handleResetStage6}
                >
                  <i className="ti ti-refresh me-1"></i> Reset Bench
                </button>
                <button
                  className={`btn px-4 py-2 fw-bold shadow-sm ${stage6Testing ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={handleStartStage6Test}
                  disabled={stage6Testing}
                >
                  <i className={`ti ${stage6Testing ? 'ti-loader spin' : 'ti-player-play'} me-1`}></i>
                  {stage6Testing ? 'Injecting 230V Power...' : 'Start Calibration Test'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Control & Parameter Banner */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 bg-primary-subtle p-3 rounded-3 shadow-2xs">
              <span className="text-muted small d-block">Reference AC Voltage</span>
              <strong className="text-primary font-mono fs-4">230.00 V</strong>
              <small className="text-success fw-medium">Tolerance &plusmn; 0.1%</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 bg-success-subtle p-3 rounded-3 shadow-2xs">
              <span className="text-muted small d-block">Reference Current</span>
              <strong className="text-success font-mono fs-4">5.000 A</strong>
              <small className="text-success fw-medium">Frequency 50.00 Hz</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 bg-info-subtle p-3 rounded-3 shadow-2xs">
              <span className="text-muted small d-block">Pulse Error Limit</span>
              <strong className="text-info-emphasis font-mono fs-4">&le; &plusmn; 0.20%</strong>
              <small className="text-info fw-medium font-mono">1600 imp / kWh</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 bg-warning-subtle p-3 rounded-3 shadow-2xs">
              <span className="text-muted small d-block">Error Lock System</span>
              <strong className="text-warning-emphasis font-mono fs-4">ACTIVE LOCK</strong>
              <small className="text-dark fw-medium">Auto-Lock on &gt;0.20% Error</small>
            </div>
          </div>
        </div>

        {/* 6-Position Calibration Bench Telemetry Grid */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="ti ti-layout-grid fs-4 me-2 text-primary"></i>
              <h5 className="mb-0 fw-bold text-dark">6-Position Calibration Bench Telemetry</h5>
            </div>
            <button
              className="btn btn-sm btn-success fw-semibold shadow-2xs"
              onClick={handleSaveStage6ToDb}
              disabled={stage6Testing}
            >
              <i className="ti ti-database-check me-1"></i> Save Calibration to DB
            </button>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {stage6Meters.map((m, idx) => (
                <div key={idx} className="col-md-6 col-lg-4">
                  <div className={`border rounded-3 p-3 transition-all h-100 shadow-2xs ${m.status === 'PASS' ? 'border-success-subtle bg-white' : 'border-danger-subtle bg-white'}`}>
                    <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                      <span className="badge bg-dark text-white font-mono px-2 py-1">Position #{m.pos}</span>
                      <span className={`badge ${m.status === 'PASS' ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'} font-mono`}>
                        <i className={`ti ${m.status === 'PASS' ? 'ti-check' : 'ti-x'} me-1`}></i>
                        {m.status}
                      </span>
                    </div>

                    <div className="mb-2">
                      <small className="text-muted d-block">Meter Serial Number</small>
                      <strong className="text-dark font-mono fs-6">{m.serial_no}</strong>
                    </div>

                    <div className="row g-2 font-mono text-xs my-2 bg-light p-2 rounded border">
                      <div className="col-6">
                        <span className="text-muted d-block">Voltage (V):</span>
                        <strong className="text-primary">{m.voltage} V</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Current (A):</span>
                        <strong className="text-success">{m.current} A</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Active Power:</span>
                        <strong className="text-dark">{m.power} W</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Pulse Rate:</span>
                        <strong className="text-dark">{m.pulse_rate} imp/kWh</strong>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                      <div>
                        <span className="text-muted small d-block">Pulse Error %</span>
                        <strong className={`fs-5 font-mono ${Math.abs(m.error_pct) <= 0.20 ? 'text-success' : 'text-danger'}`}>
                          {m.error_pct > 0 ? `+${m.error_pct}%` : `${m.error_pct}%`}
                        </strong>
                      </div>
                      <div className="text-end">
                        <span className="text-muted small d-block">Error Lock</span>
                        <span className={`badge px-2 py-1 ${m.error_lock === 'NO LOCK' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                          <i className={`ti ${m.error_lock === 'NO LOCK' ? 'ti-lock-open' : 'ti-lock'} me-1`}></i>
                          {m.error_lock}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Calibration Terminal Logs */}
        <div className="card bg-dark text-white border-secondary font-mono shadow-sm">
          <div className="card-header bg-black py-2 px-3 border-secondary d-flex align-items-center justify-content-between">
            <span className="small text-secondary fw-bold">
              <i className="ti ti-terminal me-2 text-info"></i>Calibration Bench Live Serial Telemetry Logs
            </span>
            <span className="badge bg-secondary text-white text-xs">230V 5A Source Sync</span>
          </div>
          <div className="card-body p-3 overflow-auto" style={{ maxHeight: '180px', fontSize: '0.785rem' }}>
            {stage6Logs.map((lg, i) => (
              <div key={i} className="text-light opacity-90">{lg}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGenericStage = (stgNum, stgTitle, lineType, stationId, desc, iconName) => {
    return (
      <div className="container-fluid px-0 pb-4">
        {/* Top Header Bar */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <i className={`ti ${iconName} text-primary`}></i>
                    <span>{stgTitle}</span>
                  </h1>
                  <span className="badge text-white font-mono px-2.5 py-1 fs-6 shadow-2xs" style={{ backgroundColor: '#ff5c00' }}>
                    {stgNum}-Stage
                  </span>
                  <span className="badge bg-success text-white px-3 py-1.5 font-mono text-xs d-inline-flex align-items-center gap-1 shadow-2xs">
                    <i className="ti ti-circle-check fs-6"></i> Station Active ({stationId})
                  </span>
                </div>
                <p className="text-secondary mb-0 small">
                  {lineType} &bull; Process Checks: {desc}
                </p>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm font-sans fw-semibold shadow-2xs">
                  <i className="ti ti-file-spreadsheet me-1 text-success"></i> Export Logs
                </button>
                <button className="btn btn-primary px-4 py-2 fw-bold shadow-sm">
                  <i className="ti ti-player-play me-1"></i> Start Stage Operation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Work Order / Work ID Card assigned by Admin/Supervisor */}
        {activeWorkForm && (
          <div className="card shadow-2xs border-0 border-start border-4 border-primary mb-4 bg-white">
            <div className="card-body p-3.5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2.5 bg-primary-subtle text-primary rounded-3 fs-3 flex-shrink-0">
                  <i className="ti ti-id-badge"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="badge bg-primary text-white font-mono fs-6 px-2.5 py-1 shadow-2xs">
                      Assigned Work ID: {activeWorkForm.form_id}
                    </span>
                    <span className="fw-bold text-dark fs-6">{activeWorkForm.form_title}</span>
                    <span className={`badge px-2 py-0.5 small ${activeWorkForm.status === 'IN_PROGRESS' ? 'bg-success text-white' : 'bg-primary-subtle text-primary'}`}>
                      {activeWorkForm.status || 'IN_PROGRESS'}
                    </span>
                  </div>
                  <div className="small text-secondary d-flex align-items-center gap-2 flex-wrap">
                    <span><strong>Batch:</strong> <span className="font-mono text-dark">{activeWorkForm.batch_no || 'BATCH-2026-01'}</span></span>
                    <span>&bull;</span>
                    <span><strong>Target:</strong> <span className="text-dark">{activeWorkForm.target_quantity || 100} Meters</span></span>
                    <span>&bull;</span>
                    <span><strong>Assigned to:</strong> <span className="text-primary fw-semibold">{activeWorkForm.assigned_operator_name || user?.name || 'Operator'}</span></span>
                    <span>&bull;</span>
                    <span><strong>Assigned by:</strong> <span className="text-muted">{activeWorkForm.reassigned_by || activeWorkForm.assigned_by || 'Admin/Supervisor'}</span></span>
                  </div>
                  {activeWorkForm.description && (
                    <div className="text-muted text-xs mt-1 bg-light p-1.5 rounded border">
                      <i className="ti ti-info-circle me-1 text-primary"></i>
                      <strong>Instructions:</strong> {activeWorkForm.description}
                    </div>
                  )}
                </div>
              </div>

              {operatorWorkForms.length > 1 && (
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span className="small text-muted fw-semibold text-nowrap">Switch Work ID:</span>
                  <select
                    className="form-select form-select-sm font-mono fw-semibold"
                    style={{ minWidth: '180px' }}
                    value={activeWorkForm.id || activeWorkForm.form_id}
                    onChange={(e) => {
                      const sel = operatorWorkForms.find(f => String(f.id) === e.target.value || f.form_id === e.target.value);
                      if (sel) setActiveWorkForm(sel);
                    }}
                  >
                    {operatorWorkForms.map(f => (
                      <option key={f.id || f.form_id} value={f.id || f.form_id}>
                        {f.form_id} ({f.batch_no || 'BATCH'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage Process Information & Telemetry Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <i className={`ti ${iconName} fs-4 me-2 text-primary`}></i>
                  <h5 className="mb-0 fw-bold text-dark">Stage Process Execution Console</h5>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-1">
                  Ready for Production
                </span>
              </div>
              <div className="card-body p-4">
                <div className="alert alert-light border d-flex align-items-center mb-4 text-dark">
                  <i className="ti ti-info-circle fs-3 me-3 text-primary"></i>
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">Stage Specification Overview</h6>
                    <p className="mb-0 small text-muted">
                      <strong>Line:</strong> {lineType} &bull; <strong>Hardware Station:</strong> {stationId} &bull; <strong>Assigned Operator:</strong> {user?.name || user?.user_name || 'Operator'} {user?.employee_id ? `(${user.employee_id})` : ''}
                    </p>
                  </div>
                </div>

                <div className="border rounded-3 p-4 bg-light-subtle text-center py-5 border-dashed mb-3">
                  <i className={`ti ${iconName} fs-1 text-primary opacity-75 mb-3 d-block`}></i>
                  <h4 className="fw-bold text-dark mb-2">{stgTitle} Console Active</h4>
                  <p className="text-secondary small mb-4 max-w-lg mx-auto">
                    {desc}. Station operational telemetry, process checklist validation, and database records.
                  </p>
                  <button className="btn btn-primary px-4 py-2 fw-bold shadow-sm">
                    <i className="ti ti-player-play me-1"></i> Trigger Stage {stgNum} Process Check
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="mb-0 fw-bold text-dark">Station Hardware & Line Status</h6>
              </div>
              <div className="card-body p-3">
                <div className="vstack gap-3 small font-mono">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Production Line:</span>
                    <strong className="text-dark">{lineType}</strong>
                  </div>
                  <hr className="my-0 text-muted opacity-25" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Station ID:</span>
                    <strong className="text-primary">{stationId}</strong>
                  </div>
                  <hr className="my-0 text-muted opacity-25" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Operator:</span>
                    <strong className="text-dark">{user?.name || 'Operator'}</strong>
                  </div>
                  <hr className="my-0 text-muted opacity-25" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Station Status:</span>
                    <span className="badge bg-success-subtle text-success border border-success px-2 py-1">OPERATIONAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (stageId === 6) {
    return renderStage06Calibration();
  }

  // Generic Stages (Stages other than Stage 4 JIG Test and Stage 6 Calibration Bench)
  if (stageId !== 4) {
    const matchedStage = allStages.find(s => (s.stage_number || s.id) === stageId) ||
      (user?.assignedStagesList || []).find(s => (s.stage_number || s.id) === stageId);

    const stgNum = matchedStage?.stage_number || matchedStage?.id || stageId;
    const stgTitle = matchedStage?.stage_name || `Stage ${String(stgNum).padStart(2, '0')}`;
    const lineType = matchedStage?.line_type || 'Main Meter Assembly Line';
    const stationId = matchedStage?.hardware_station || `Station-${String(stgNum).padStart(2, '0')}`;
    const desc = matchedStage?.description || 'Station process operational checklist validation';

    // Dedicated Meter Box Body Print Laser Marking & Optical DLMS Console (Stage 7 or Stage 9)
    const isBodyPrintStage =
      stgNum === 9 ||
      stgNum === 7 ||
      stgTitle.toLowerCase().includes('body print') ||
      (stgNum === 7 && stgTitle.toLowerCase().includes('meter')) ||
      (stgNum === 9 && stgTitle.toLowerCase().includes('meter'));

    if (isBodyPrintStage) {
      return (
        <MeterBodyPrintConsole
          stageId={stgNum}
          stageTitle={stgTitle}
          lineType={lineType}
          stationId={stationId}
          user={user}
          canManageWorkId={false}
          initialWorkForm={activeWorkForm}
          initialFormId={activeWorkForm?.form_id}
        />
      );
    }

    const iconMap = {
      1: 'ti-code',
      2: 'ti-cpu-2',
      3: 'ti-box',
      5: 'ti-package',
      7: 'ti-shield-check',
      8: 'ti-tag',
      9: 'ti-barcode',
      10: 'ti-printer',
      11: 'ti-box-seam',
      12: 'ti-qrcode'
    };
    const iconName = iconMap[stgNum] || 'ti-cpu';

    return renderGenericStage(stgNum, stgTitle, lineType, stationId, desc, iconName);
  }

  return (
    <>
      {/* Work ID Switcher Ribbon & Port Connectivity Header Bar (Row: Col 6, Col 3, Col 3 - Exact Stage 9 Style) */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-body py-2 px-3">
          <div className="row align-items-center g-3">
            {/* Col 6: Active Work ID Info */}
            <div className="col-xl-6 col-lg-6 col-12">
              {!activeWorkForm ? (
                <div className="text-secondary small fst-italic d-flex align-items-center gap-1.5 py-1">
                  <i className="ti ti-id-badge text-warning fs-5"></i>
                  <span>No Work ID currently assigned to Stage #4. Assign a Work ID in Stage Management to start production.</span>
                </div>
              ) : (
                <div className="small font-mono text-secondary d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="d-inline-flex align-items-center gap-1.5">
                      <i className="ti ti-id-badge text-danger fs-5"></i>
                      <strong className="text-dark">ACTIVE WORK ID:</strong>{' '}
                      <span className="fw-bold" style={{ color: '#e05338' }}>{activeWorkForm.form_id}</span>
                    </span>
                    <span className="text-muted">|</span>
                    <span>
                      <strong>Batch:</strong> <span className="text-dark fw-bold">{activeWorkForm.batch_no || '-'}</span>
                    </span>
                    {activeWorkForm.month_year && (
                      <>
                        <span className="text-muted">|</span>
                        <span>
                          <strong>Date:</strong> <span className="text-dark fw-bold">{activeWorkForm.month_year}</span>
                        </span>
                      </>
                    )}
                    <span className="text-muted">|</span>
                    <span>
                      <strong>Target:</strong> <span className="text-dark fw-bold">{activeWorkForm.target_quantity || 0}</span>
                    </span>
                    <span className="text-muted">|</span>
                    <span>
                      <strong>Completed:</strong> <span className="text-success fw-bold">{activeWorkForm.completed_quantity || 0}</span>
                    </span>
                  </div>

                  {operatorWorkForms && operatorWorkForms.length > 1 && (
                    <div className="d-flex align-items-center gap-1.5 ms-auto">
                      <span className="text-muted small fw-semibold text-nowrap">Switch:</span>
                      <select
                        className="form-select form-select-sm font-mono fw-semibold py-0.5"
                        style={{ minWidth: '130px', fontSize: '11.5px' }}
                        value={activeWorkForm.id || activeWorkForm.form_id}
                        onChange={(e) => {
                          const sel = operatorWorkForms.find(f => String(f.id) === e.target.value || f.form_id === e.target.value);
                          if (sel) setActiveWorkForm(sel);
                        }}
                      >
                        {operatorWorkForms.map(f => (
                          <option key={f.id || f.form_id} value={f.id || f.form_id}>
                            {f.form_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Col 3: NIC Receive Port Card */}
            <div className="col-xl-3 col-lg-3 col-md-6 col-12">
              <div
                className="p-2 px-2.5 rounded-3 bg-white shadow-2xs d-flex align-items-center justify-content-between"
                style={{ gap: '10px' }}
              >
                <div className="d-flex align-items-center" style={{ gap: '10px', minWidth: 0 }}>
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
                    style={{ width: '38px', height: '38px' }}
                  >
                    <i
                      className={`ti ${isConnectingPort
                        ? 'ti-loader spin text-warning'
                        : usbConnected
                          ? 'ti-plug-connected text-success'
                          : 'ti-usb'
                        } fs-4`}
                    ></i>
                  </div>
                  <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
                    <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13px', lineHeight: 1.2 }}>
                      NIC Receive Port
                    </div>
                    <div className="d-flex align-items-center small text-nowrap" style={{ gap: '5px', fontSize: '11px' }}>
                      <span
                        className={`rounded-circle d-inline-block flex-shrink-0 ${usbConnected
                          ? 'bg-success'
                          : isConnectingPort
                            ? 'bg-warning'
                            : 'bg-danger'
                          }`}
                        style={{ width: '6px', height: '6px' }}
                      ></span>
                      <span
                        className={`fw-medium text-truncate ${usbConnected
                          ? 'text-success'
                          : isConnectingPort
                            ? 'text-warning-emphasis'
                            : 'text-muted'
                          }`}
                        style={{ maxWidth: '110px' }}
                        title={
                          usbConnected
                            ? (usbDeviceName || selectedPort || 'Connected')
                            : isConnectingPort
                              ? 'Connecting...'
                              : 'Disconnected'
                        }
                      >
                        {usbConnected
                          ? (usbDeviceName ? (usbDeviceName.match(/COM\d+/i) ? `Connected (${usbDeviceName.match(/COM\d+/i)[0].toUpperCase()})` : 'Connected') : 'Connected')
                          : isConnectingPort
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
                  onClick={() => setShowReceiveSettings(true)}
                  title="Configure NIC Receive Port COM Settings"
                >
                  <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* Col 3: Laser Port Card */}
            <div className="col-xl-3 col-lg-3 col-md-6 col-12">
              <div
                className="p-2 px-2.5 rounded-3 bg-white shadow-2xs d-flex align-items-center justify-content-between"
                style={{ gap: '10px' }}
              >
                <div className="d-flex align-items-center" style={{ gap: '10px', minWidth: 0 }}>
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary border border-secondary-subtle"
                    style={{ width: '38px', height: '38px' }}
                  >
                    <i
                      className={`ti ${isConnectingLaserPort
                        ? 'ti-loader spin text-warning'
                        : laserConnected
                          ? 'ti-printer text-success'
                          : 'ti-printer-off'
                        } fs-4`}
                    ></i>
                  </div>
                  <div className="d-flex flex-column justify-content-center" style={{ gap: '2px', minWidth: 0 }}>
                    <div className="fw-semibold text-dark text-nowrap" style={{ fontSize: '13px', lineHeight: 1.2 }}>
                      Laser Port
                    </div>
                    <div className="d-flex align-items-center small text-nowrap" style={{ gap: '5px', fontSize: '11px' }}>
                      <span
                        className={`rounded-circle d-inline-block flex-shrink-0 ${laserConnected
                          ? 'bg-success'
                          : isConnectingLaserPort
                            ? 'bg-warning'
                            : 'bg-danger'
                          }`}
                        style={{ width: '6px', height: '6px' }}
                      ></span>
                      <span
                        className={`fw-medium text-truncate ${laserConnected
                          ? 'text-success'
                          : isConnectingLaserPort
                            ? 'text-warning-emphasis'
                            : 'text-muted'
                          }`}
                        style={{ maxWidth: '110px' }}
                        title={
                          laserConnected
                            ? (laserDeviceName || selectedLaserPort || 'Connected')
                            : isConnectingLaserPort
                              ? 'Connecting...'
                              : 'Disconnected'
                        }
                      >
                        {laserConnected
                          ? (laserDeviceName ? (laserDeviceName.match(/COM\d+/i) ? `Connected (${laserDeviceName.match(/COM\d+/i)[0].toUpperCase()})` : 'Connected') : 'Connected')
                          : isConnectingLaserPort
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
                  onClick={() => setShowLaserSettings(true)}
                  title="Configure Laser Port COM Settings"
                >
                  <i className="ti ti-settings" style={{ fontSize: '13px' }}></i>
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Popup: NIC Receive Port Settings */}
      <HardwarePortModal
        isOpen={showReceiveSettings}
        onClose={() => setShowReceiveSettings(false)}
        title="NIC Receive Port"
        connected={usbConnected}
        checking={isConnectingPort}
        portOptions={jigPortOptions}
        selectedPort={selectedPort}
        onSelectPort={(val) => setSelectedPort(val)}
        onPairNewPort={handlePairDeviceManagerPort}
        onConnect={() => handleConnectJigPort(selectedPort)}
        onDisconnect={handleDisconnectJigPort}
        config={jigSerialConfig}
        onChangeConfig={(newCfg) => setJigSerialConfig(newCfg)}
      />

      {/* Modal Popup: Laser Port Settings */}
      <HardwarePortModal
        isOpen={showLaserSettings}
        onClose={() => setShowLaserSettings(false)}
        title="Laser Port"
        connected={laserConnected}
        checking={isConnectingLaserPort}
        portOptions={laserPortOptions}
        selectedPort={selectedLaserPort}
        onSelectPort={(val) => setSelectedLaserPort(val)}
        onPairNewPort={handlePairLaserDeviceManagerPort}
        onConnect={() => handleConnectLaserPort(selectedLaserPort)}
        onDisconnect={handleDisconnectLaserPort}
        config={laserSerialConfig}
        onChangeConfig={(newCfg) => setLaserSerialConfig(newCfg)}
      />

      {/* Active Work Order / Work ID Card assigned by Admin/Supervisor */}
      {/* 8-Channel Telemetry Grid */}
      <div className="mb-1">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="fs-6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <i className="ti ti-layout-grid text-primary"></i>
            <span>8-Channel Hardware Telemetry Output</span>
          </h4>
        </div>

        {/* Row 1: Channels 1, 2, 3, 4 */}
        <div className="row g-2.5 mb-2">
          {activeChannels.slice(0, 4).map((c) => renderChannelBox(c))}
        </div>

        {/* Row 2: Channels 5, 6, 7, 8 */}
        <div className="row g-2.5 mb-3">
          {activeChannels.slice(4, 8).map((c) => renderChannelBox(c))}
        </div>

        {/* Bottom of 8 Channel Boxes: Collapsible Docklight-Style Communication Terminal Logs */}
        {showLogsConsole && (
          <div className="card bg-dark text-white border-secondary mb-3 font-mono shadow-sm">
            <div className="card-header bg-dark border-secondary py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="small text-success fw-bold d-flex align-items-center gap-1">
                <i className="ti ti-terminal"></i> Serial Communication Log
              </span>
              <button className="btn btn-xs btn-outline-light" onClick={() => setJigLogs([])}>Clear Log</button>
            </div>
            <div className="card-body p-3 text-xs" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {jigLogs.length === 0 ? (
                <div className="text-secondary opacity-75">
                  No serial communication logs recorded yet. Plug in USB device and click "Start Jig test".
                </div>
              ) : (
                jigLogs.map((logStr, idx) => (
                  <div key={idx} className={logStr.includes('[ERR]') ? 'text-danger fw-bold' : logStr.includes('[RX]') ? 'text-info fw-bold' : 'text-warning'}>
                    {logStr}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer Bar */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body py-2 px-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 bg-light rounded-3">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={handleResetJigConsole}
              disabled={testState === 'STARTING' || testState === 'SAVING'}
              className="btn btn-sm btn-outline-secondary px-3 py-1.5 fw-semibold"
            >
              <i className="ti ti-x me-1"></i> Reset
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3 py-1.5 font-mono"
              onClick={() => setShowLogsConsole(!showLogsConsole)}
            >
              <i className="ti ti-terminal me-1"></i>
              {showLogsConsole ? 'Hide Serial Logs' : 'View Serial Logs'}
            </button>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Start Jig Test Button */}
            <button
              className={`btn btn-sm px-3.5 py-1.5 fw-bold shadow-sm d-inline-flex align-items-center text-nowrap ${isStartDisabled ? 'btn-secondary opacity-75' : 'btn-primary'
                }`}
              onClick={handleJigStart}
              disabled={isStartDisabled}
              title={isDemoMode ? "Simulate Full Jig Test Protocol & Telemetry" : "Send START to USB -> Receive Data -> Check Duplicates -> Save DB"}
            >
              <i className={`ti ${testState === 'STARTING' || testState === 'SAVING' ? 'ti-loader spin' : 'ti-player-play'} me-1.5`}></i>
              {testState === 'STARTING'
                ? (isDemoMode ? 'Simulating Protocol...' : 'Communicating Protocol...')
                : testState === 'SAVING'
                  ? 'Saving to DB...'
                  : (isDemoMode ? 'Start Demo Test' : 'Start Jig test')}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handleOpenPrintModal}
              disabled={!jigData || !jigData.ch}
              className="btn btn-sm px-3.5 py-1.5 fw-bold shadow-2xs text-white d-inline-flex align-items-center"
              style={{ backgroundColor: '#ff7043', borderColor: '#ff7043' }}
              title="Print Channel JSON Data & Send to Printer API"
            >
              <i className="ti ti-printer me-1.5"></i> Print
            </button>

            {/* Validate QR's Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              disabled={!jigData || !jigData.ch}
              className="btn btn-sm btn-outline-primary px-3.5 py-1.5 fw-bold shadow-2xs d-inline-flex align-items-center"
              title="Open QR Validation and Scanner Interface for tested NIC cards"
            >
              <i className="ti ti-qrcode me-1.5"></i> Validate QR's
            </button>
          </div>
        </div>
      </div>

      {/* NIC QR Code Printable & Scanner Validation Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={
          <div className="d-flex align-items-center gap-2">
            <div className="p-1.5 bg-primary-subtle text-primary rounded-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
              <i className="ti ti-qrcode fs-5"></i>
            </div>
            <div>
              <div className="fs-6 fw-bold text-dark mb-0">Validate NIC Card QR Codes {cycleUuid ? `(${cycleUuid})` : ''}</div>
              <div className="text-secondary small fw-normal text-2xs">Optical verification & 2D barcode batch confirmation</div>
            </div>
          </div>
        }
        size="xxl"
        maxWidth="1160px"
      >
        <div className="p-0">
          {(() => {
            const validChannelsForQr = activeChannels.filter(c => {
              const cls = getChannelClassification(c);
              // Show only valid channels that have IMEI and non-duplicate PASS/CON status
              return c.imei && (c.st === 'PASS' || c.st === 'CON') && !cls.isDuplicate;
            });

            if (validChannelsForQr.length === 0) {
              return (
                <div className="text-center py-5 text-muted border rounded-3 bg-light">
                  <i className="ti ti-qrcode-off fs-1 d-block mb-2 text-warning opacity-75"></i>
                  <h6 className="fw-bold text-dark mb-1">No Valid Saved Channels for QR Validation</h6>
                  <p className="small mb-0 text-secondary">
                    Only non-duplicate PASS / CON channels saved in DB with valid IMEI numbers will generate QR codes.
                  </p>
                </div>
              );
            }

            const totalCount = validChannelsForQr.length;
            const validatedCount = validChannelsForQr.filter(c => validationStatus[c.ch] === 'MATCHED').length;
            const mismatchCount = validChannelsForQr.filter(c => validationStatus[c.ch] === 'MISMATCH').length;
            const isAllValidated = totalCount > 0 && validatedCount === totalCount;

            const handleResetAllScans = () => {
              setScannedValues({});
              setValidationStatus({});
              if (qrInputRefs.current && qrInputRefs.current[0]) {
                qrInputRefs.current[0].focus();
              }
            };

            const handleAutoValidateAll = () => {
              const newScanned = {};
              const newStatus = {};
              validChannelsForQr.forEach(c => {
                const payload = JSON.stringify({
                  imei_no: String(c.imei || '').trim(),
                  comms_technology: String(c.comms_technology || "12")
                });
                newScanned[c.ch] = payload;
                newStatus[c.ch] = 'MATCHED';
              });
              setScannedValues(newScanned);
              setValidationStatus(newStatus);
            };

            return (
              <div>
                {/* Top Control & Status Toolbar */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2.5 p-2 bg-light rounded-3 border no-print">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge bg-dark font-mono text-xs px-2.5 py-1 rounded fw-bold">
                      2 Rows × 4 Columns Layout
                    </span>
                    {isAllValidated ? (
                      <span className="badge bg-success text-white text-xs px-2.5 py-1 rounded fw-bold d-flex align-items-center gap-1 shadow-2xs">
                        <i className="ti ti-circle-check fs-6"></i> All {totalCount} Channels Verified
                      </span>
                    ) : (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-xs px-2.5 py-1 rounded fw-bold d-flex align-items-center gap-1">
                        <i className="ti ti-qrcode fs-6"></i> Validated: {validatedCount} / {totalCount}
                      </span>
                    )}
                    {mismatchCount > 0 && (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle text-xs px-2.5 py-1 rounded fw-bold d-flex align-items-center gap-1">
                        <i className="ti ti-alert-triangle fs-6"></i> {mismatchCount} Mismatch
                      </span>
                    )}
                    <span className="text-muted text-xs d-none d-xl-inline-flex align-items-center gap-1 ms-1">
                      <i className="ti ti-keyboard text-secondary"></i>
                      <span>Scanner automatically advances to next channel upon valid match</span>
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success fw-bold d-flex align-items-center gap-1 px-2.5 py-1"
                      onClick={handleAutoValidateAll}
                      title="Validate all channels at once (Demo / Fast Verification)"
                    >
                      <i className="ti ti-checks"></i>
                      <span>Auto-Validate All</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1 px-2.5 py-1"
                      onClick={handleResetAllScans}
                      title="Clear all scanned inputs"
                    >
                      <i className="ti ti-refresh"></i>
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary text-white fw-bold d-flex align-items-center gap-1 px-3 py-1 shadow-2xs"
                      onClick={() => window.print()}
                      title="Print QR label sheet (Landscape)"
                    >
                      <i className="ti ti-printer"></i>
                      <span>Print Labels</span>
                    </button>
                  </div>
                </div>

                {/* 2 Rows × 4 Columns Grid (8 Channels, Normal Size) */}
                <div id="printable-nic-qr-grid" className="row g-2.5">
                  {validChannelsForQr.map((c, idx) => {
                    const qrPayload = JSON.stringify({
                      imei_no: String(c.imei || '').trim(),
                      comms_technology: String(c.comms_technology || "12")
                    });

                    const statusVal = validationStatus[c.ch];
                    const isMatched = statusVal === 'MATCHED';
                    const isMismatch = statusVal === 'MISMATCH';

                    return (
                      <div key={c.ch} className="col-12 col-sm-6 col-lg-3">
                        <div
                          className={`card h-100 transition-all ${isMatched
                            ? 'border-success border-2 shadow-xs'
                            : isMismatch
                              ? 'border-danger border-2 shadow-xs'
                              : 'border-secondary-subtle shadow-2xs'
                            }`}
                          style={{
                            borderRadius: '10px',
                            backgroundColor: isMatched ? '#f0fdf4' : isMismatch ? '#fef2f2' : '#ffffff'
                          }}
                        >
                          {/* Compact Card Header */}
                          <div
                            className="card-header px-2 py-1 d-flex justify-content-between align-items-center"
                            style={{
                              backgroundColor: isMatched ? '#dcfce7' : isMismatch ? '#fee2e2' : '#f8fafc',
                              borderBottom: isMatched ? '1px solid #bbf7d0' : isMismatch ? '1px solid #fecaca' : '1px solid #e2e8f0',
                              borderTopLeftRadius: '9px',
                              borderTopRightRadius: '9px'
                            }}
                          >
                            <div className="d-flex align-items-center gap-1.5 overflow-hidden">
                              <span
                                className={`badge ${isMatched ? 'bg-success' : 'bg-primary'
                                  } text-white font-mono px-2 py-0.5 rounded fw-bold text-2xs`}
                              >
                                CH {String(c.ch).padStart(2, '0')}
                              </span>
                              {c.nic_uuid && (
                                <span
                                  className="text-secondary font-mono text-2xs text-truncate"
                                  style={{ maxWidth: '105px' }}
                                  title={c.nic_uuid}
                                >
                                  {c.nic_uuid}
                                </span>
                              )}
                            </div>
                            <span className="badge bg-success text-white font-mono text-2xs px-1.5 py-0.5 fw-bold">
                              ✓ {c.st || 'PASS'}
                            </span>
                          </div>

                          {/* Compact Card Body */}
                          <div className="card-body p-2 d-flex flex-column justify-content-between">
                            {/* QR Code Graphic - Normal Proportion */}
                            <div className="d-flex justify-content-center my-1">
                              <div
                                className="p-1 bg-white rounded-2 border d-inline-flex justify-content-center align-items-center"
                                style={{
                                  borderColor: isMatched ? '#86efac' : isMismatch ? '#fca5a5' : '#e2e8f0',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                              >
                                <QRCodeSVG value={qrPayload} size={78} />
                              </div>
                            </div>

                            {/* Serial / Hardware Metadata Row */}
                            <div
                              className="rounded-2 px-2 py-1 mb-1.5 font-mono text-2xs d-flex justify-content-between align-items-center"
                              style={{
                                backgroundColor: isMatched ? '#eefdf4' : isMismatch ? '#fdf2f2' : '#f8fafc',
                                border: '1px solid',
                                borderColor: isMatched ? '#bbf7d0' : isMismatch ? '#fecaca' : '#e2e8f0'
                              }}
                            >
                              <div className="text-truncate me-1" title={c.imei}>
                                <span className="text-secondary fw-semibold">IMEI: </span>
                                <span className="fw-bold text-primary font-mono">{c.imei}</span>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="text-secondary fw-semibold">Tech: </span>
                                <span className="fw-bold text-dark">{c.comms_technology || "12"}</span>
                              </div>
                            </div>

                            {/* Scanner Input & Status */}
                            <div className="text-start">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-2xs fw-bold text-dark d-flex align-items-center gap-1">
                                  <i className="ti ti-scan text-primary"></i>
                                  <span>Scan CH {c.ch}:</span>
                                </span>
                                {isMatched && (
                                  <span className="badge bg-success text-white fw-bold px-1.5 py-0.5 text-3xs d-flex align-items-center gap-1">
                                    <i className="ti ti-check"></i> VALIDATED
                                  </span>
                                )}
                                {isMismatch && (
                                  <span className="badge bg-danger text-white fw-bold px-1.5 py-0.5 text-3xs d-flex align-items-center gap-1">
                                    <i className="ti ti-x"></i> MISMATCH
                                  </span>
                                )}
                                {!isMatched && !isMismatch && (
                                  <span className="badge bg-light text-secondary border text-3xs px-1.5 py-0.5">
                                    PENDING
                                  </span>
                                )}
                              </div>

                              <div className="input-group input-group-sm">
                                <span
                                  className={`input-group-text px-1.5 py-0 ${isMatched
                                    ? 'bg-success text-white border-success'
                                    : isMismatch
                                      ? 'bg-danger text-white border-danger'
                                      : 'bg-light text-muted'
                                    }`}
                                >
                                  <i className={`ti ${isMatched ? 'ti-check' : isMismatch ? 'ti-alert-circle' : 'ti-barcode'} fs-6`}></i>
                                </span>
                                <input
                                  ref={el => (qrInputRefs.current[idx] = el)}
                                  type="text"
                                  className={`form-control form-control-sm font-mono text-2xs px-2 ${isMatched
                                    ? 'border-success bg-white text-success fw-bold'
                                    : isMismatch
                                      ? 'border-danger bg-white text-danger fw-bold'
                                      : 'border-secondary-subtle'
                                    }`}
                                  style={{ height: '30px' }}
                                  placeholder="Scan payload or IMEI..."
                                  value={scannedValues[c.ch] || ''}
                                  onChange={(e) => handleScanInput(c.ch, idx, c, e.target.value)}
                                  onKeyDown={(e) => handleScanKeyDown(e, idx)}
                                />
                                {scannedValues[c.ch] && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-1.5 text-muted border-start-0"
                                    title="Clear this scan"
                                    style={{ height: '30px' }}
                                    onClick={() => {
                                      setScannedValues(prev => ({ ...prev, [c.ch]: '' }));
                                      setValidationStatus(prev => ({ ...prev, [c.ch]: null }));
                                      if (qrInputRefs.current[idx]) qrInputRefs.current[idx].focus();
                                    }}
                                  >
                                    <i className="ti ti-x text-2xs"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Laser & Thermal Printer JSON Payload Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="NIC Card Label Print Payload (JSON Data)"
        size="lg"
      >
        <div className="p-2">
          {(() => {
            const validChannels = activeChannels.filter(c => c.imei && (c.st === 'PASS' || c.st === 'CON'));
            if (validChannels.length === 0) {
              return (
                <div className="text-center py-5 text-muted border rounded-3 bg-light">
                  <i className="ti ti-printer-off fs-1 d-block mb-2 text-warning opacity-75"></i>
                  <h6 className="fw-bold text-dark mb-1">No Valid Channels to Print</h6>
                  <p className="small mb-0 text-secondary">
                    Please click "Start Demo Test" or "Start Jig test" to generate channel telemetry with valid IMEI numbers before printing.
                  </p>
                </div>
              );
            }

            const batchJson = validChannels.map((c, idx) => ({
              s_no: idx + 1,
              imei_no: String(c.imei || '').trim(),
              comms_technology: String(c.comms_technology || "12")
            }));

            return (
              <div>
                {/* Header Summary Bar inside Modal */}
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3 p-3 bg-light rounded-3 border">
                  <div>
                    <div className="fw-bold text-dark d-flex align-items-center gap-2">
                      <i className="ti ti-printer text-primary fs-5"></i>
                      <span>Stage 4 Laser / Thermal Print Dispatch</span>
                      <span className="badge bg-primary text-white font-mono px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                        {batchJson.length} Channels
                      </span>
                      {cycleUuid && (
                        <span className="badge bg-dark text-white font-mono px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                          {cycleUuid}
                        </span>
                      )}
                    </div>
                    <small className="text-muted d-block mt-0.5">
                      Batch API payload with sequential <code className="text-primary font-mono fw-bold">s_no</code>, <code className="text-primary font-mono fw-bold">imei_no</code>, and <code className="text-primary font-mono fw-bold">comms_technology</code> dispatched to Print Engine.
                    </small>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary font-mono d-flex align-items-center gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(batchJson, null, 2));
                        showWarningAlert('JSON Copied', 'Batch print payload copied to clipboard.');
                      }}
                    >
                      <i className="ti ti-copy"></i> Copy JSON
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary fw-bold font-mono d-flex align-items-center gap-1 shadow-sm"
                      onClick={handleSendPrintApi}
                      disabled={isSendingPrintApi}
                    >
                      <i className={`ti ${isSendingPrintApi ? 'ti-loader spin' : 'ti-send'}`}></i>
                      {isSendingPrintApi ? 'Sending API...' : 'Send to Printer API'}
                    </button>
                  </div>
                </div>

                {/* API Response Alert if already sent */}
                {printApiResponse && (
                  <div className={`alert ${printApiResponse.success ? 'alert-success' : 'alert-danger'} p-3 rounded-3 mb-3 d-flex align-items-start gap-2 shadow-2xs`}>
                    <i className={`ti ${printApiResponse.success ? 'ti-circle-check fs-4 text-success' : 'ti-alert-circle fs-4 text-danger'} flex-shrink-0 mt-0.5`}></i>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="d-block">{printApiResponse.success ? 'HTTP 200 OK — Batch Print API Dispatched Successfully' : 'Print API Error'}</strong>
                        <span className="badge bg-white text-dark border font-mono text-2xs">
                          {printApiResponse.timestamp || new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="small d-block mt-0.5">{printApiResponse.message || printApiResponse.error}</span>
                    </div>
                  </div>
                )}

                {/* Batch API JSON Payload Display */}
                <div className="card border rounded-3 bg-dark text-white font-mono shadow-sm mb-3">
                  <div className="card-header bg-dark border-secondary py-2 px-3 d-flex justify-content-between align-items-center">
                    <span className="text-warning-emphasis fw-bold small d-flex align-items-center gap-1.5">
                      <i className="ti ti-code"></i>
                      <span>Batch API JSON Payload ({batchJson.length} items &bull; s_no indexed)</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-light font-mono"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(batchJson, null, 2));
                        showWarningAlert('JSON Copied', 'Batch JSON payload copied to clipboard.');
                      }}
                    >
                      <i className="ti ti-copy me-1"></i>Copy
                    </button>
                  </div>
                  <div className="card-body p-3 text-xs" style={{ maxHeight: '460px', overflowY: 'auto' }}>
                    <pre className="mb-0 text-success" style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(batchJson, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Print Stylesheet and Utilities */}
      <style>{`
        .text-2xs {
          font-size: 0.72rem !important;
        }
        .text-3xs {
          font-size: 0.65rem !important;
        }
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-nic-qr-grid, #printable-nic-qr-grid * {
            visibility: visible;
          }
          #printable-nic-qr-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
          }
          #printable-nic-qr-grid .col-lg-3,
          #printable-nic-qr-grid .col-sm-6,
          #printable-nic-qr-grid .col-12 {
            width: 25% !important;
            float: left !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );

  // Helper render for channel box
  function renderChannelBox(c) {
    const cls = getChannelClassification(c);
    const isEditing = editingChannelId === c.ch;

    let cardBorderStyle = { border: '1px solid #e2e8f0', backgroundColor: '#ffffff' };
    let badgeClass = 'bg-secondary-subtle text-secondary border';
    let badgeText = c.st || 'NCON';
    let statusIcon = 'ti-power';

    if (c.st === 'TESTING') {
      cardBorderStyle = { border: '2px solid #3b82f6', backgroundColor: '#ffffff', boxShadow: '0 0 8px rgba(59, 130, 246, 0.2)' };
      badgeClass = 'bg-primary text-white';
      badgeText = 'TESTING';
      statusIcon = 'ti-loader spin';
    } else if (cls.isDuplicate) {
      cardBorderStyle = { border: '2px solid #f59e0b', backgroundColor: '#ffffff', boxShadow: '0 0 8px rgba(245, 158, 11, 0.2)' };
      const stClean = c.st === 'PASS' ? 'PASS' : c.st === 'CON' ? 'CON' : (c.st || 'NCON');
      badgeClass = (stClean === 'PASS' || stClean === 'CON') ? 'bg-success text-white fw-bold' : 'bg-secondary-subtle text-secondary border';
      badgeText = stClean;
      statusIcon = (stClean === 'PASS' || stClean === 'CON') ? 'ti-check' : 'ti-power';
    } else if (c.st === 'FAIL') {
      cardBorderStyle = { border: '2px solid #ef4444', backgroundColor: '#ffffff', boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)' };
      badgeClass = 'bg-danger text-white fw-bold';
      badgeText = 'FAIL';
      statusIcon = 'ti-alert-circle';
    } else if (cls.isValid) {
      cardBorderStyle = { border: '2px solid #10b981', backgroundColor: '#ffffff', boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)' };
      badgeClass = 'bg-success text-white fw-bold';
      badgeText = c.st === 'PASS' ? 'PASS' : c.st;
      statusIcon = 'ti-check';
    }

    const isPrinted = Boolean(printedChannels[c.ch]);
    const isSaved = Boolean(c.nic_uuid || (c.isSavedToDb && isSavedToDb));

    return (
      <div key={c.ch} className="col-lg-3 col-md-6 col-12">
        <div className="card transition-all shadow-sm" style={{ ...cardBorderStyle, borderRadius: '8px' }}>
          {/* Card Header */}
          <div className="card-header bg-transparent py-1.5 px-2.5 d-flex justify-content-between align-items-center border-bottom">
            <div className="d-flex align-items-center gap-1.5">
              <i className="ti ti-cpu text-primary" style={{ fontSize: '13px' }}></i>
              <span className="fw-bold text-dark" style={{ fontSize: '12px' }}>Channel {c.ch}</span>
            </div>

            <div className="d-flex align-items-center gap-1">
              <span className={`badge ${badgeClass} font-mono px-1.5 py-0.5`} style={{ fontSize: '10.5px' }}>
                <i className={`ti ${statusIcon} me-1`}></i>
                {badgeText}
              </span>
              <button
                type="button"
                className={`btn btn-xs py-0.5 px-1.5 border-0 ${isEditing ? 'btn-secondary' : 'btn-outline-primary'}`}
                onClick={() => handleStartEditCard(c)}
                title="Edit Channel Data Manually"
                style={{ lineHeight: 1 }}
              >
                <i className={`ti ${isEditing ? 'ti-x' : 'ti-pencil'}`} style={{ fontSize: '11px' }}></i>
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="card-body p-2 px-2.5 font-mono" style={{ fontSize: '11.5px' }}>
            {isEditing ? (
              /* Inline Edit Mode Form */
              <div className="d-flex flex-column gap-1.5 bg-white p-2 rounded border shadow-2xs">
                <div className="fw-bold text-primary border-bottom pb-1 mb-0.5 text-2xs d-flex justify-content-between align-items-center">
                  <span><i className="ti ti-edit me-1"></i>Edit Ch {c.ch}</span>
                  <span className="text-muted text-3xs">Manual Input</span>
                </div>
                <div>
                  <label className="text-secondary text-3xs mb-0 fw-semibold">IMEI Number:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm font-mono py-0.5 px-1.5 text-xs fw-bold"
                    style={{ height: '28px', fontSize: '11px' }}
                    value={editFormData.imei}
                    onChange={(e) => setEditFormData({ ...editFormData, imei: e.target.value })}
                    placeholder="Enter IMEI..."
                  />
                </div>
                <div className="row g-1">
                  <div className="col-6">
                    <label className="text-secondary text-3xs mb-0">HWV:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-mono py-0.5 px-1.5"
                      style={{ height: '26px', fontSize: '11px' }}
                      value={editFormData.hwv}
                      onChange={(e) => setEditFormData({ ...editFormData, hwv: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-secondary text-3xs mb-0">FWV:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-mono py-0.5 px-1.5"
                      style={{ height: '26px', fontSize: '11px' }}
                      value={editFormData.fwv}
                      onChange={(e) => setEditFormData({ ...editFormData, fwv: e.target.value })}
                    />
                  </div>
                </div>
                <div className="row g-1">
                  <div className="col-6">
                    <label className="text-secondary text-3xs mb-0">SIG:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-mono py-0.5 px-1.5"
                      style={{ height: '26px', fontSize: '11px' }}
                      value={editFormData.sig}
                      onChange={(e) => setEditFormData({ ...editFormData, sig: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-secondary text-3xs mb-0">Comms Tech:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-mono py-0.5 px-1.5"
                      style={{ height: '26px', fontSize: '11px' }}
                      value={editFormData.comms_technology}
                      onChange={(e) => setEditFormData({ ...editFormData, comms_technology: e.target.value })}
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-1 mt-1 pt-1 border-top">
                  <button
                    type="button"
                    className="btn btn-xs btn-primary fw-bold px-2 py-0.5"
                    style={{ fontSize: '11px' }}
                    onClick={() => handleUpdateChannelCard(c.ch, false)}
                  >
                    <i className="ti ti-check me-0.5"></i>Update
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-success text-white fw-bold px-2 py-0.5"
                    style={{ fontSize: '11px' }}
                    onClick={() => handleUpdateChannelCard(c.ch, true)}
                  >
                    <i className="ti ti-database-import me-0.5"></i>Save DB
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <>
                {c.nic_uuid && (
                  <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                    <span className="text-secondary" style={{ fontSize: '11px' }}>nic_uuid:</span>
                    <span className="fw-bold text-primary font-mono" style={{ fontSize: '11.5px' }}>{c.nic_uuid}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>imei:</span>
                  <span className={`fw-bold font-mono ${cls.isDuplicate ? 'text-warning text-dark' : 'text-dark'}`} style={{ fontSize: '11.5px' }}>
                    {c.imei || '-'}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>hwv:</span>
                  <span className="fw-bold text-dark font-mono" style={{ fontSize: '11.5px' }}>{c.hwv || '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>fwv:</span>
                  <span className="fw-bold text-dark font-mono" style={{ fontSize: '11.5px' }}>{c.fwv || '-'}</span>
                </div>

                {/* Card Bottom: Sig, DB Status & QR-Print Status */}
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>sig:</span>
                  <span className={`fw-bold ${c.sig ? 'text-success' : 'text-muted'}`} style={{ fontSize: '11.5px' }}>{c.sig || '-'}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light-subtle">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>DB:</span>
                  {testState === 'SAVING' ? (
                    <span className="text-primary fw-bold text-3xs d-inline-flex align-items-center gap-1">
                      <i className="ti ti-loader spin"></i>Processing...
                    </span>
                  ) : cls.isDuplicate ? (
                    <span className="badge bg-warning-subtle text-dark border border-warning px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                      DUPLICATE
                    </span>
                  ) : isSaved ? (
                    <span className="badge bg-success-subtle text-success border border-success px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                      <i className="ti ti-check me-0.5"></i>SAVED
                    </span>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '11px' }}>-</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-secondary" style={{ fontSize: '11px' }}>QR-Print:</span>
                  {isPrinted ? (
                    <span className="badge bg-success-subtle text-success border border-success px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                      Printed
                    </span>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '11px' }}>-</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
