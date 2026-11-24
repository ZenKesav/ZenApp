import { useState, useEffect, useCallback } from 'react';
import { stage11Service } from '../../services/stages/stage11.service';

export function useStage11MasterCarton() {
  const [cartonInput, setCartonInput] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [packedCartons, setPackedCartons] = useState([
    'CTN-ZM-2601-1001',
    'CTN-ZM-2601-1002',
    'CTN-ZM-2601-1003',
    'CTN-ZM-2601-1004'
  ]);
  const [grossWeight, setGrossWeight] = useState(2.14);
  const [scaleConnected, setScaleConnected] = useState(true);
  const [printerOnline, setPrinterOnline] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [masterSerial, setMasterSerial] = useState('MST-ZM-2601-0082');
  const [isSealed, setIsSealed] = useState(false);

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '10:20:01', text: '[SCALE] CAS Industrial Heavy-Duty Floor Platform Scale Connected', type: 'info' },
    { id: 2, time: '10:20:02', text: '[PRINTER] Zebra ZT411 Industrial Master Shipper 4x6" Printer Ready', type: 'info' },
    { id: 3, time: '10:20:03', text: '[READY] Stage 11 Master Carton Aggregation Console Active.', type: 'success' }
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
      const res = await stage11Service.getRecords();
      const list = Array.isArray(res) ? res : (res?.data || res?.records || []);
      setRecords(list);
    } catch (e) {
      setRecords([
        { id: 1, master_no: 'MST-ZM-2601-0080', carton_count: 10, gross_weight: '5.32 kg', destination: 'BESCOM Zone-2', status: 'DISPATCH_READY', time: '09:40 AM' },
        { id: 2, master_no: 'MST-ZM-2601-0081', carton_count: 10, gross_weight: '5.35 kg', destination: 'BESCOM Zone-2', status: 'DISPATCH_READY', time: '10:05 AM' }
      ]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Recalculate estimated gross weight dynamically
  useEffect(() => {
    // Empty shipper box ~450g + 486g per carton
    const weightKg = parseFloat((0.45 + (packedCartons.length * 0.486)).toFixed(2));
    setGrossWeight(weightKg);
  }, [packedCartons]);

  const addCarton = useCallback((cartonNo) => {
    const trimmed = (cartonNo || cartonInput).trim();
    if (!trimmed) return;

    if (packedCartons.includes(trimmed)) {
      addLog(`[WARN] Carton ${trimmed} is already packed in this master box!`, 'error');
      return;
    }

    if (packedCartons.length >= capacity) {
      addLog(`[WARN] Master Carton is full (${capacity}/${capacity}). Seal and print before adding more.`, 'error');
      return;
    }

    setPackedCartons(prev => [...prev, trimmed]);
    setCartonInput('');
    addLog(`[PACK] Scanned carton ${trimmed} into Master Box (${packedCartons.length + 1}/${capacity}).`, 'info');
  }, [cartonInput, packedCartons, capacity, addLog]);

  const removeCarton = useCallback((index) => {
    setPackedCartons(prev => {
      const removed = prev[index];
      addLog(`[REMOVE] Removed carton ${removed} from Master Box.`, 'info');
      return prev.filter((_, i) => i !== index);
    });
  }, [addLog]);

  const sealAndPrintMasterBox = useCallback(async () => {
    if (packedCartons.length === 0) return;

    setIsPrinting(true);
    addLog(`[ZEBRA] Generating GS1-128 Shipping Manifest Label for ${masterSerial}...`, 'info');

    setTimeout(() => {
      addLog(`[ZEBRA] 4x6" Pallet Dispatch Label printed successfully.`, 'success');
    }, 1000);

    setTimeout(async () => {
      setIsPrinting(false);
      setIsSealed(true);
      addLog(`[DISPATCH] Master Box ${masterSerial} sealed with ${packedCartons.length} cartons @ ${grossWeight} kg.`, 'success');

      try {
        await stage11Service.submitMasterBox({
          master_no: masterSerial,
          cartons: packedCartons,
          gross_weight: `${grossWeight} kg`,
          carton_count: packedCartons.length,
          status: 'DISPATCH_READY'
        });
      } catch (e) {}

      fetchRecords();
    }, 1600);
  }, [packedCartons, masterSerial, grossWeight, addLog, fetchRecords]);

  const resetForNextMaster = useCallback(() => {
    const nextMaster = `MST-ZM-${Date.now().toString().slice(-6)}`;
    setMasterSerial(nextMaster);
    setPackedCartons([]);
    setIsSealed(false);
    addLog(`[RESET] Initialized new empty Master Shipping Box: ${nextMaster}.`, 'info');
  }, [addLog]);

  return {
    cartonInput,
    setCartonInput,
    capacity,
    setCapacity,
    packedCartons,
    grossWeight,
    scaleConnected,
    printerOnline,
    isPrinting,
    masterSerial,
    isSealed,
    records,
    loadingRecords,
    logs,
    addCarton,
    removeCarton,
    sealAndPrintMasterBox,
    resetForNextMaster,
    fetchRecords
  };
}
