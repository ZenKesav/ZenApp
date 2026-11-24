import { useState, useEffect, useCallback } from 'react';
import { qcService, qcTestService } from '../../services/qc/qc.service';

export function useQcInspection() {
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [meterDetails, setMeterDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // QC Test listing state
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Hold & Rejected state
  const [holdMeters, setHoldMeters] = useState([]);
  const [rejectedMeters, setRejectedMeters] = useState([]);
  const [loadingHold, setLoadingHold] = useState(false);
  const [loadingRejected, setLoadingRejected] = useState(false);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Fetch QC Inspection Queue
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const res = await qcService.getQCQueue();
      const list = Array.isArray(res) ? res : (res?.data || res?.queue || []);
      setQueue(list);
      if (!selectedMeter && list.length > 0) {
        setSelectedMeter(list[0].meter_no);
      }
    } catch (err) {
      console.error('Failed to load QC queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [selectedMeter]);

  // Fetch QC Tests
  const fetchTests = useCallback(async () => {
    setLoadingTests(true);
    try {
      const res = await qcTestService.getTests({
        search,
        stage: stageFilter,
        status: statusFilter,
        page: currentPage,
        limit: pageSize
      });
      const list = Array.isArray(res) ? res : (res?.tests || res?.data || []);
      setTests(list);
    } catch (err) {
      console.error('Failed to load QC tests:', err);
    } finally {
      setLoadingTests(false);
    }
  }, [search, stageFilter, statusFilter, currentPage, pageSize]);

  // Fetch Hold and Rejected
  const fetchHoldAndRejected = useCallback(async () => {
    setLoadingHold(true);
    setLoadingRejected(true);
    try {
      const [holdRes, rejRes] = await Promise.allSettled([
        qcService.getHoldMeters(),
        qcService.getRejectedMeters()
      ]);
      if (holdRes.status === 'fulfilled') {
        const hList = Array.isArray(holdRes.value) ? holdRes.value : (holdRes.value?.data || []);
        setHoldMeters(hList);
      }
      if (rejRes.status === 'fulfilled') {
        const rList = Array.isArray(rejRes.value) ? rejRes.value : (rejRes.value?.data || []);
        setRejectedMeters(rList);
      }
    } catch (e) {
      console.error('Hold/Rejected fetch error:', e);
    } finally {
      setLoadingHold(false);
      setLoadingRejected(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchTests();
    fetchHoldAndRejected();
  }, [fetchQueue, fetchTests, fetchHoldAndRejected]);

  // Handle Inspection Verdict
  const submitInspectionVerdict = async (meterNo, verdict, reason = '') => {
    try {
      if (verdict === 'PASSED') {
        await qcService.passMeter({ meter_no: meterNo, remarks: reason });
      } else if (verdict === 'FAILED') {
        await qcService.rejectMeter({ meter_no: meterNo, reason, remarks: reason });
      } else if (verdict === 'HOLD') {
        await qcService.holdMeter({ meter_no: meterNo, reason, remarks: reason });
      }
      fetchQueue();
      fetchHoldAndRejected();
      fetchTests();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    queue,
    loadingQueue,
    selectedMeter,
    setSelectedMeter,
    meterDetails,
    loadingDetails,
    tests,
    loadingTests,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    holdMeters,
    loadingHold,
    rejectedMeters,
    loadingRejected,
    selectedRecord,
    setSelectedRecord,
    showDetailModal,
    setShowDetailModal,
    showDefectModal,
    setShowDefectModal,
    showHoldModal,
    setShowHoldModal,
    remarks,
    setRemarks,
    fetchQueue,
    fetchTests,
    fetchHoldAndRejected,
    submitInspectionVerdict
  };
}
