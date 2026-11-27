import { useState, useEffect, useRef, useCallback } from 'react';
import { jigService } from '../../services/stages/stage04.service';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '../../core/utils/swal';

export function useStage04NicPrint(currentUser) {
  const [testState, setTestState] = useState('IDLE');
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbDeviceName, setUsbDeviceName] = useState(null);
  const [selectedPort, setSelectedPort] = useState('DEMO-PORT-01');
  const [availablePorts, setAvailablePorts] = useState([
    { path: 'DEMO-PORT-01', friendlyName: 'Demo Virtual USB Jig Port (Simulation)' }
  ]);
  const [demoMode, setDemoMode] = useState(true);

  // Channels state
  const defaultChannels = Array.from({ length: 8 }, (_, i) => ({
    ch: i + 1,
    st: 'NCON',
    imei: null,
    hwv: null,
    fwv: null,
    sim: null,
    mac: null,
    iccid: null,
    volt: null,
    curr: null,
    rssi: null
  }));

  const [activeChannels, setActiveChannels] = useState(defaultChannels);
  const [jigLogs, setJigLogs] = useState([]);
  const [cycleId, setCycleId] = useState(null);
  const [cycleUuid, setCycleUuid] = useState(null);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [saveTimestamp, setSaveTimestamp] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [dbDuplicates, setDbDuplicates] = useState([]);
  const [printedChannels, setPrintedChannels] = useState({});

  // QR Validation Scanner state
  const [scannedValues, setScannedValues] = useState({});
  const [validationStatus, setValidationStatus] = useState({});

  const appendLog = useCallback((text) => {
    const time = new Date().toLocaleTimeString();
    setJigLogs(prev => [...prev, `[${time}] ${text}`]);
  }, []);

  // Fetch available ports
  const fetchPorts = useCallback(async () => {
    try {
      const res = await jigService.listUsbPorts();
      const rawPorts = res?.ports || [];
      const rawDetailed = res?.detailedPorts || rawPorts.map(p => ({ path: p, friendlyName: p }));
      const list = [
        { path: 'DEMO-PORT-01', friendlyName: 'Demo Virtual USB Jig Port (Simulation)' },
        ...rawDetailed
      ];
      setAvailablePorts(list);
    } catch {
      setAvailablePorts([
        { path: 'DEMO-PORT-01', friendlyName: 'Demo Virtual USB Jig Port (Simulation)' }
      ]);
    }
  }, []);

  useEffect(() => {
    fetchPorts();
  }, [fetchPorts]);

  // Connect port
  const connectPort = async (portName) => {
    const port = portName || selectedPort;
    if (!port || port === 'DEMO-PORT-01') {
      setUsbConnected(true);
      setUsbDeviceName('Virtual Demo Jig (COM-SIM-01)');
      setDemoMode(true);
      setTestState('USB_CONNECTED');
      appendLog('Connected to Demo Virtual USB Jig.');
      return;
    }
    try {
      const res = await jigService.connectHardware({ path: port });
      if (res.success) {
        setUsbConnected(true);
        setUsbDeviceName(res.data?.device || port);
        setDemoMode(false);
        setTestState('USB_CONNECTED');
        appendLog(`Connected to hardware port: ${port}`);
      }
    } catch (err) {
      showErrorAlert('Connection Failed', err.message || 'Failed to connect to jig hardware.');
    }
  };

  const disconnectPort = async () => {
    if (demoMode) {
      setUsbConnected(false);
      setUsbDeviceName(null);
      setTestState('IDLE');
      appendLog('Demo Jig disconnected.');
      return;
    }
    try {
      await jigService.disconnectHardware();
      setUsbConnected(false);
      setUsbDeviceName(null);
      setTestState('IDLE');
      appendLog('Jig hardware disconnected.');
    } catch (err) {
      showErrorAlert('Disconnect Failed', err.message || 'Failed to disconnect.');
    }
  };

  // Run Test
  const startTest = async () => {
    setTestState('STARTING');
    appendLog('Sending START command to Jig Controller...');

    if (demoMode) {
      setTimeout(() => {
        setTestState('TESTING');
        appendLog('Jig Test Running: reading 8 channels in parallel...');

        setTimeout(() => {
          const cId = Math.floor(100 + Math.random() * 900);
          const uuid = `NIC-DEMO-${Date.now().toString().slice(-6)}`;
          setCycleId(cId);
          setCycleUuid(uuid);

          const generated = defaultChannels.map(c => {
            const isPass = Math.random() > 0.15;
            const imei = `86099006${String(Math.floor(1000000 + Math.random() * 9000000))}`;
            return {
              ...c,
              st: isPass ? 'PASS' : 'FAIL',
              imei: isPass ? imei : null,
              hwv: 'V2.1',
              fwv: 'v1.4.2',
              sim: isPass ? 'INSERTED' : 'NOT_DETECTED',
              mac: isPass ? '70:B3:D5:4B:21:A8' : null,
              iccid: isPass ? '8991872110298371928' : null,
              volt: isPass ? (3.8 + Math.random() * 0.4).toFixed(2) + ' V' : '0.00 V',
              curr: isPass ? (120 + Math.random() * 40).toFixed(0) + ' mA' : '0 mA',
              rssi: isPass ? '-' + Math.floor(65 + Math.random() * 20) + ' dBm' : '0 dBm'
            };
          });

          setActiveChannels(generated);
          setTestState('TEST_COMPLETED');
          setIsSavedToDb(true);
          setSaveTimestamp(new Date().toLocaleTimeString());
          setSavedCount(generated.filter(c => c.st === 'PASS').length);
          appendLog(`Jig Test Completed: 8 channels sampled. Cycle ${uuid}.`);
          showSuccessAlert('Test Completed', `Cycle #${cId} completed.`);
        }, 1200);
      }, 500);
      return;
    }

    try {
      const res = await jigService.startHardwareTest({ stage_id: 4 });
      if (res.success && res.data) {
        setTestState('TEST_COMPLETED');
        setActiveChannels(res.data.channels || defaultChannels);
        showSuccessAlert('Test Completed', 'Hardware test completed.');
      }
    } catch (err) {
      setTestState(usbConnected ? 'USB_CONNECTED' : 'IDLE');
      showErrorAlert('Test Failed', err.message || 'Jig test failed.');
    }
  };

  const resetTest = () => {
    setActiveChannels(defaultChannels);
    setCycleId(null);
    setCycleUuid(null);
    setIsSavedToDb(false);
    setSaveTimestamp(null);
    setSavedCount(0);
    setDbDuplicates([]);
    setPrintedChannels({});
    setScannedValues({});
    setValidationStatus({});
    setTestState(usbConnected ? 'USB_CONNECTED' : 'IDLE');
    appendLog('Console reset to initial state.');
  };

  // QR Barcode scan handler
  const handleScanInput = (chNo, value) => {
    setScannedValues(prev => ({ ...prev, [chNo]: value }));
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setValidationStatus(prev => ({ ...prev, [chNo]: null }));
      return;
    }

    const targetCh = activeChannels.find(c => c.ch === chNo);
    const targetImei = targetCh?.imei || '';

    let scannedImei = trimmed;
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        scannedImei = String(parsed.imei_no || parsed.imei || trimmed).trim();
      }
    } catch {}

    const isMatch = targetImei && (scannedImei === targetImei || trimmed.includes(targetImei));
    setValidationStatus(prev => ({
      ...prev,
      [chNo]: isMatch ? 'MATCHED' : 'MISMATCH'
    }));
  };

  return {
    testState,
    usbConnected,
    usbDeviceName,
    selectedPort,
    setSelectedPort,
    availablePorts,
    demoMode,
    connectPort,
    disconnectPort,
    activeChannels,
    setActiveChannels,
    jigLogs,
    appendLog,
    cycleId,
    cycleUuid,
    isSavedToDb,
    saveTimestamp,
    savedCount,
    dbDuplicates,
    printedChannels,
    setPrintedChannels,
    scannedValues,
    validationStatus,
    handleScanInput,
    startTest,
    resetTest
  };
}

export default useStage04NicPrint;
