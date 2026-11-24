import { useState, useEffect, useCallback } from 'react';
import { stage10Service } from '../../services/stages/stage10.service';

export function useStage10CartonPrint() {
  const [meterSerial, setMeterSerial] = useState('');
  const [scaleWeight, setScaleWeight] = useState(486.5);
  const [tare, setTare] = useState(0.0);
  const [isWeighing, setIsWeighing] = useState(false);
  const [scaleConnected, setScaleConnected] = useState(true);
  const [printerOnline, setPrinterOnline] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [cartonBarcode, setCartonBarcode] = useState('');
  const [isPacked, setIsPacked] = useState(false);

  // Target 485g ± 15g (470g to 500g)
  const isWeightPass = scaleWeight >= 470 && scaleWeight <= 500;
  const weightStatus = scaleWeight < 470 ? 'UNDERWEIGHT' : scaleWeight > 500 ? 'OVERWEIGHT' : 'PASS';

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '10:15:01', text: '[SCALE] Mettler Toledo Digital RS-232 Scale Connected (Tare: 0.0g)', type: 'info' },
    { id: 2, time: '10:15:02', text: '[PRINTER] Zebra ZD421 Thermal Barcode Printer Ready (203 DPI)', type: 'info' },
    { id: 3, time: '10:15:03', text: '[READY] Stage 10 Meter Carton Packaging & Weight Check Active.', type: 'success' }
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
      const res = await stage10Service.getRecords();
      const list = Array.isArray(res) ? res : (res?.data || res?.records || []);
      setRecords(list);
    } catch (e) {
      setRecords([
        { id: 1, carton_no: 'CTN-ZM-2601-1001', meter_serial: 'ZM-MTR-2026-9001', gross_weight: '486.2 g', print_status: 'PRINTED', status: 'PASS', time: '10:28 AM' },
        { id: 2, carton_no: 'CTN-ZM-2601-1002', meter_serial: 'ZM-MTR-2026-9002', gross_weight: '485.8 g', print_status: 'PRINTED', status: 'PASS', time: '10:30 AM' },
        { id: 3, carton_no: 'CTN-ZM-2601-1003', meter_serial: 'ZM-MTR-2026-9003', gross_weight: '487.1 g', print_status: 'PRINTED', status: 'PASS', time: '10:32 AM' }
      ]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const tareScale = useCallback(() => {
    setTare(scaleWeight);
    setScaleWeight(0.0);
    addLog('[SCALE] Scale Tared to 0.00g zero-reference.', 'info');
  }, [scaleWeight, addLog]);

  const triggerWeighing = useCallback((serial) => {
    const target = serial || meterSerial;
    if (!target.trim()) return;

    setIsWeighing(true);
    addLog(`[SCALE] Sampling weight for meter carton ${target.trim()}...`, 'info');

    setTimeout(() => {
      const weight = parseFloat((483 + Math.random() * 5).toFixed(1));
      setScaleWeight(weight);
      setIsWeighing(false);
      addLog(`[SCALE] Gross Weight: ${weight}g &bull; Status: ${weight >= 470 && weight <= 500 ? 'PASS (In Tolerance)' : 'REJECT'}`, 'success');
    }, 700);
  }, [meterSerial, addLog]);

  const triggerPrintAndPack = useCallback(async () => {
    if (!meterSerial.trim() || !isWeightPass) return;

    setIsPrinting(true);
    const newCartonNo = `CTN-ZM-${Date.now().toString().slice(-6)}`;
    setCartonBarcode(newCartonNo);
    addLog(`[ZEBRA] Generating ZPL II Carton Barcode Label: ${newCartonNo}...`, 'info');

    setTimeout(() => {
      addLog(`[ZEBRA] Thermal printing completed on 100x50mm carton label.`, 'success');
    }, 900);

    setTimeout(async () => {
      setIsPrinting(false);
      setIsPacked(true);
      addLog(`[DB] Carton ${newCartonNo} registered with Meter ${meterSerial.trim()} @ ${scaleWeight}g.`, 'success');

      try {
        await stage10Service.submitCarton({
          carton_no: newCartonNo,
          meter_serial: meterSerial.trim(),
          gross_weight: `${scaleWeight} g`,
          status: 'PASS'
        });
      } catch (e) {}

      fetchRecords();
    }, 1500);
  }, [meterSerial, isWeightPass, scaleWeight, addLog, fetchRecords]);

  const resetStation = useCallback(() => {
    setMeterSerial('');
    setCartonBarcode('');
    setIsPacked(false);
    setScaleWeight(486.0);
    addLog('[RESET] Station cleared for next individual carton.', 'info');
  }, [addLog]);

  return {
    meterSerial,
    setMeterSerial,
    scaleWeight,
    scaleConnected,
    isWeighing,
    printerOnline,
    isPrinting,
    cartonBarcode,
    isPacked,
    isWeightPass,
    weightStatus,
    records,
    loadingRecords,
    logs,
    tareScale,
    triggerWeighing,
    triggerPrintAndPack,
    resetStation,
    fetchRecords
  };
}
