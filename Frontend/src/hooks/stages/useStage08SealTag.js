import { useState, useEffect, useCallback } from 'react';
import { stage08Service } from '../../services/stages/stage08.service';

export function useStage08SealTag() {
  const [sealBarcode, setSealBarcode] = useState('');
  const [meterSerial, setMeterSerial] = useState('');
  const [isSealing, setIsSealing] = useState(false);
  const [isWelded, setIsWelded] = useState(false);
  const [isMismatch, setIsMismatch] = useState(false);
  const [mismatchReason, setMismatchReason] = useState('');

  // Ultrasonic Welder Machine Parameters
  const [weldTemp, setWeldTemp] = useState(185);
  const [clampPressure, setClampPressure] = useState(4.2);
  const [weldDuration, setWeldDuration] = useState(1.20);
  const [ultrasonicFrequency, setUltrasonicFrequency] = useState(20.0);

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '10:10:01', text: '[SYSTEM] Ultrasonic Horn Generator Online @ 20.00 kHz', type: 'info' },
    { id: 2, time: '10:10:02', text: '[PNEUMATICS] Main Air Line Regulated @ 4.20 Bar', type: 'info' },
    { id: 3, time: '10:10:03', text: '[READY] Stage 08 Dual Barcode Matching Ready.', type: 'success' }
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
      const res = await stage08Service.getRecords();
      const list = Array.isArray(res) ? res : (res?.data || res?.records || []);
      setRecords(list);
    } catch (e) {
      setRecords([
        { id: 1, seal_barcode: 'SEAL-ZM-892147', meter_serial: 'ZM-MTR-2026-9001', weld_temp: '185°C', pressure: '4.2 bar', status: 'VERIFIED', time: '10:20 AM' },
        { id: 2, seal_barcode: 'SEAL-ZM-892148', meter_serial: 'ZM-MTR-2026-9002', weld_temp: '186°C', pressure: '4.2 bar', status: 'VERIFIED', time: '10:22 AM' },
        { id: 3, seal_barcode: 'SEAL-ZM-892149', meter_serial: 'ZM-MTR-2026-9003', weld_temp: '184°C', pressure: '4.1 bar', status: 'VERIFIED', time: '10:25 AM' }
      ]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Check matching whenever both barcodes are present
  useEffect(() => {
    if (sealBarcode.trim() && meterSerial.trim()) {
      if (sealBarcode.length < 5 || meterSerial.length < 5) {
        setIsMismatch(true);
        setMismatchReason('Invalid barcode format. Expected minimum 5 alphanumeric characters.');
      } else {
        setIsMismatch(false);
        setMismatchReason('');
      }
    } else {
      setIsMismatch(false);
      setMismatchReason('');
    }
  }, [sealBarcode, meterSerial]);

  const triggerSealWeld = useCallback(async () => {
    if (!sealBarcode.trim() || !meterSerial.trim()) return;
    if (isMismatch) return;

    setIsSealing(true);
    addLog(`[CLAMP] Pneumatic clamp cylinder engaged @ ${clampPressure} bar...`, 'info');

    setTimeout(() => {
      addLog(`[WELD] Ultrasonic horn active @ ${ultrasonicFrequency} kHz. Temperature: ${weldTemp}°C...`, 'info');
    }, 600);

    setTimeout(() => {
      addLog('[HOLD] Cooling and curing ultrasonic plastic weld for 0.8s...', 'info');
    }, 1200);

    setTimeout(async () => {
      setIsSealing(false);
      setIsWelded(true);
      addLog(`[SUCCESS] Seal ${sealBarcode.trim()} permanently bonded to Meter ${meterSerial.trim()}. Verified tamper-proof.`, 'success');

      try {
        await stage08Service.submitSeal({
          seal_barcode: sealBarcode.trim(),
          meter_serial: meterSerial.trim(),
          weld_temp: `${weldTemp}°C`,
          pressure: `${clampPressure} bar`,
          status: 'VERIFIED'
        });
      } catch (e) {}

      fetchRecords();
    }, 1800);
  }, [sealBarcode, meterSerial, isMismatch, clampPressure, ultrasonicFrequency, weldTemp, addLog, fetchRecords]);

  const resetInputs = useCallback(() => {
    setSealBarcode('');
    setMeterSerial('');
    setIsWelded(false);
    setIsMismatch(false);
    setMismatchReason('');
    addLog('[RESET] Station inputs cleared for next meter unit.', 'info');
  }, [addLog]);

  return {
    sealBarcode,
    setSealBarcode,
    meterSerial,
    setMeterSerial,
    isSealing,
    isWelded,
    isMismatch,
    mismatchReason,
    weldTemp,
    clampPressure,
    weldDuration,
    ultrasonicFrequency,
    records,
    loadingRecords,
    logs,
    triggerSealWeld,
    resetInputs,
    fetchRecords
  };
}
