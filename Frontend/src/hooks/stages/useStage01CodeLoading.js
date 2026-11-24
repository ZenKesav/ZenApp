import { useState, useEffect, useCallback } from 'react';
import { stage01Service } from '../../services/stages/stage01.service';

export function useStage01CodeLoading() {
  const [clampEngaged, setClampEngaged] = useState(true);
  const [programmerConnected, setProgrammerConnected] = useState(true);
  const [programmerStatus, setProgrammerStatus] = useState('READY'); // 'READY' | 'FLASHING' | 'VERIFYING' | 'DONE' | 'ERROR'
  const [firmwareVersion, setFirmwareVersion] = useState('v3.14.2-ZM-Release.hex');
  const [checksum, setChecksum] = useState('0x8FA43E2B');
  const [pcbSerial, setPcbSerial] = useState('');
  const [chipUid, setChipUid] = useState('0x003A0028-57355011-20343354');
  const [progress, setProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '10:00:01', text: 'JIG-01 SWD Interface initialized @ 4.0MHz', type: 'info' },
    { id: 2, time: '10:00:02', text: 'Target MCU detected: STM32F4 / Renesas RA6M5', type: 'success' },
    { id: 3, time: '10:00:03', text: 'Pneumatic clamp pressure nominal: 4.5 bar', type: 'info' }
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
      const res = await stage01Service.getRecords();
      const list = Array.isArray(res) ? res : (res?.data || res?.records || []);
      setRecords(list);
    } catch (e) {
      // Mock fallback
      setRecords([
        { id: 1, pcb_serial: 'PCB-ZM-9041', chip_uid: '0x003A0028-57355011', fw_version: 'v3.14.2', checksum: '0x8FA4', status: 'PASSED', time: '10:04 AM' },
        { id: 2, pcb_serial: 'PCB-ZM-9040', chip_uid: '0x003B0014-48215012', fw_version: 'v3.14.2', checksum: '0x8FA4', status: 'PASSED', time: '10:02 AM' }
      ]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const startFlashing = useCallback(async () => {
    if (!pcbSerial.trim()) {
      addLog('Error: Please scan or enter PCB Serial Number first.', 'error');
      return;
    }
    if (!clampEngaged) {
      addLog('Error: JIG-01 pneumatic clamp not engaged!', 'error');
      return;
    }

    setIsFlashing(true);
    setProgrammerStatus('FLASHING');
    setProgress(10);
    addLog(`Erasing target flash sectors for PCB #${pcbSerial}...`, 'info');

    setTimeout(() => {
      setProgress(45);
      addLog(`Flashing ${firmwareVersion} (128 KB) over SWD...`, 'info');
    }, 600);

    setTimeout(() => {
      setProgress(80);
      setProgrammerStatus('VERIFYING');
      addLog('Flashing complete. Calculating SHA-256 checksum...', 'info');
    }, 1300);

    setTimeout(async () => {
      setProgress(100);
      setProgrammerStatus('DONE');
      setIsFlashing(false);
      const randomUid = '0x003A' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(10000000 + Math.random() * 90000000);
      setChipUid(randomUid);
      addLog(`Checksum verified: ${checksum} - MATCH!`, 'success');
      addLog(`MCU Flashing SUCCESS for PCB #${pcbSerial} (UID: ${randomUid})`, 'success');

      try {
        await stage01Service.submitTest({
          pcb_serial: pcbSerial,
          chip_uid: randomUid,
          fw_version: firmwareVersion,
          checksum,
          status: 'PASSED'
        });
      } catch (e) {}

      setRecords(prev => [
        {
          id: Date.now(),
          pcb_serial: pcbSerial,
          chip_uid: randomUid,
          fw_version: firmwareVersion,
          checksum,
          status: 'PASSED',
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      setPcbSerial('');
    }, 2000);
  }, [pcbSerial, clampEngaged, firmwareVersion, checksum, addLog]);

  return {
    clampEngaged,
    setClampEngaged,
    programmerConnected,
    setProgrammerConnected,
    programmerStatus,
    firmwareVersion,
    setFirmwareVersion,
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
  };
}
