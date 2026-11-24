import { useState, useEffect, useCallback } from 'react';
import { supervisorTestService, supervisorService } from '../../services/supervisor/supervisor.service';

export function useSupervisorOverride() {
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Selected items
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [targetMeter, setTargetMeter] = useState(null);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch Supervisor Tests
  const fetchTests = useCallback(async () => {
    setLoadingTests(true);
    try {
      const res = await supervisorTestService.getTests({
        search,
        stage: stageFilter,
        status: statusFilter,
        page: currentPage,
        limit: pageSize
      });
      const list = Array.isArray(res) ? res : (res?.tests || res?.data || []);
      setTests(list);
    } catch (err) {
      console.error('Failed to load supervisor tests:', err);
    } finally {
      setLoadingTests(false);
    }
  }, [search, stageFilter, statusFilter, currentPage, pageSize]);

  // Fetch Audit Trail
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await supervisorService.getAuditLogs();
      const list = Array.isArray(res) ? res : (res?.logs || res?.data || []);
      setAuditLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchAuditLogs();
  }, [fetchTests, fetchAuditLogs]);

  // Handle Stage Override
  const submitOverride = async (meterNo, stageNumber, justification, supervisorPin) => {
    try {
      await supervisorService.overrideStage({
        meter_no: meterNo,
        stage_number: stageNumber,
        justification,
        supervisor_pin: supervisorPin
      });
      fetchTests();
      fetchAuditLogs();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
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
    selectedRecord,
    setSelectedRecord,
    showDetailModal,
    setShowDetailModal,
    showOverrideModal,
    setShowOverrideModal,
    targetMeter,
    setTargetMeter,
    auditLogs,
    loadingAudit,
    fetchTests,
    fetchAuditLogs,
    submitOverride
  };
}
