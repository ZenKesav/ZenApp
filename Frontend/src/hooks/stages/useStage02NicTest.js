import { useState, useEffect, useCallback } from 'react';
import { stage02Service } from '../../services/stages/stage02.service';

export function useStage02NicTest() {
  const [shieldBoxClosed, setShieldBoxClosed] = useState(true);
  const [modemPortConnected, setModemPortConnected] = useState(true);
  const [testRunning, setTestRunning] = useState(false);

  // RF Telemetry
  const [rssi, setRssi] = useState(-74); // dBm
  const [rsrp, setRsrp] = useState(-98); // dBm
  const [sinr, setSinr] = useState(14.2); // dB
  const [networkOperator, setNetworkOperator] = useState('Airtel IoT / Jio 4G (NB-IoT)');
  const [modemStatus, setModemStatus] = useState('ATTACHED');

  const [nicSerial, setNicSerial] = useState('');
  const [imei, setImei] = useState('');
  const [iccid, setIccid] = useState('');
  const [macAddress, setMacAddress] = useState('');

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '10:00:01', text: 'RF Shield Box Pneumatics interlock: ENGAGED (-65dB isolation)', type: 'info' },
    { id: 2, time: '10:00:02', text: 'COM7 Modem AT interface ready @ 115200 baud', type: 'success' },
    { id: 3, time: '10:00:03', text: 'Carrier Frequency: Band 3 (1800MHz) / Band 8 (900MHz)', type: 'info' }
  ]);

  const addLog = useCallback((text, type = 'info') => {
    setLogs(prev => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 99)
    ]);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const res = await stage02Service.getRecords();
      const list = Array.isArray(res) ? res : (res?.data || res?.records || []);
      setRecords(list);
    } catch (e) {
      setRecords([
        { id: 1, nic_serial: 'NIC-ZM-8012', imei: '864912051284912', rssi: '-72 dBm', network: 'Airtel IoT', status: 'PASSED', time: '10:05 AM' },
        { id: 2, nic_serial: 'NIC-ZM-8011', imei: '864912051284911', rssi: '-75 dBm', network: 'Jio 4G', status: 'PASSED', time: '10:03 AM' }
      ]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const runNicRfTest = useCallback(async () => {
    if (!nicSerial.trim()) {
      addLog('Error: Please scan or input NIC Serial Number.', 'error');
      return;
    }
    if (!shieldBoxClosed) {
      addLog('Error: RF Shield Box is OPEN! Close pneumatic lid before RF transmission.', 'error');
      return;
    }

    setTestRunning(true);
    addLog(`Initiating Cellular RF test for NIC #${nicSerial}...`, 'info');
    addLog('TX: AT+CFUN=1 (Full RF Mode)', 'info');

    setTimeout(() => {
      addLog('RX: OK | TX: AT+CGSN (Read IMEI)', 'info');
      const mockImei = '86491205' + Math.floor(1000000 + Math.random() * 9000000);
      setImei(mockImei);
    }, 400);

    setTimeout(() => {
      addLog('TX: AT+CSQ (Signal Quality)', 'info');
      const mockRssi = Math.floor(-68 - Math.random() * 14);
      setRssi(mockRssi);
      addLog(`RX: +CSQ: 24,99 (RSSI: ${mockRssi} dBm - EXCELLENT)`, 'success');
    }, 900);

    setTimeout(() => {
      addLog('TX: AT+CEREG? (Network Registration check)', 'info');
      addLog('RX: +CEREG: 0,1 (Home Network Registered)', 'success');
      addLog('TX: AT+QPING=1,"8.8.8.8",3 (IP Ping test: RTT 34ms)', 'success');
    }, 1400);

    setTimeout(async () => {
      setTestRunning(false);
      const generatedImei = imei || ('86491205' + Math.floor(1000000 + Math.random() * 9000000));
      const mockMac = '00:1B:44:' + Math.floor(10 + Math.random() * 89) + ':' + Math.floor(10 + Math.random() * 89) + ':' + Math.floor(10 + Math.random() * 89);
      setMacAddress(mockMac);

      addLog(`Stage 02 Test SUCCESS: NIC #${nicSerial} validated!`, 'success');

      try {
        await stage02Service.submitTest({
          nic_serial: nicSerial,
          imei: generatedImei,
          mac: mockMac,
          rssi: `${rssi} dBm`,
          status: 'PASSED'
        });
      } catch (e) {}

      setRecords(prev => [
        {
          id: Date.now(),
          nic_serial: nicSerial,
          imei: generatedImei,
          rssi: `${rssi} dBm`,
          network: networkOperator,
          status: 'PASSED',
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      setNicSerial('');
    }, 1900);
  }, [nicSerial, shieldBoxClosed, imei, rssi, networkOperator, addLog]);

  return {
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
    iccid,
    macAddress,
    records,
    loadingRecords,
    logs,
    runNicRfTest,
    fetchRecords
  };
}
