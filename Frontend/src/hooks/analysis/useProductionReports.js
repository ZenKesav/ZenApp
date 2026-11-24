import { useState, useEffect, useCallback } from 'react';
import { reportService, productionService, meterService } from '../../services/analysis/analysis.service';

export function useProductionReports() {
  const [reportType, setReportType] = useState('daily'); // 'daily' | 'monthly' | 'yearly' | 'custom'
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Production Overview
  const [overviewData, setOverviewData] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalProduced: 12480,
    overallYield: '98.6%',
    activeWorkOrders: 8,
    averageCycleTime: '24.2s'
  });

  // Traceability
  const [searchMeterNo, setSearchMeterNo] = useState('');
  const [traceability, setTraceability] = useState(null);
  const [loadingTraceability, setLoadingTraceability] = useState(false);

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch Report Data
  const fetchReport = useCallback(async (type = reportType) => {
    setLoadingReport(true);
    try {
      let res;
      if (type === 'daily') {
        res = await reportService.getDailyReport({ date: selectedDate });
      } else if (type === 'monthly') {
        res = await reportService.getMonthlyReport({ month: selectedMonth });
      } else if (type === 'yearly') {
        res = await reportService.getYearlyReport({ year: '2026' });
      } else {
        res = await reportService.getCustomReport(dateRange);
      }
      const list = Array.isArray(res) ? res : (res?.reports || res?.data || []);
      setReportData(list);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [reportType, selectedDate, selectedMonth, dateRange]);

  // Fetch Production Overview
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await productionService.getProductionOverview();
      const list = Array.isArray(res) ? res : (res?.stages || res?.data || []);
      setOverviewData(list);
    } catch (err) {
      console.error('Production overview error:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch Meter Traceability
  const searchTraceability = useCallback(async (meterNo) => {
    if (!meterNo) return;
    setLoadingTraceability(true);
    try {
      const res = await meterService.getTraceability(meterNo);
      setTraceability(res?.traceability || res?.data || res);
    } catch (err) {
      console.error('Traceability search error:', err);
      setTraceability(null);
    } finally {
      setLoadingTraceability(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchOverview();
  }, [fetchReport, fetchOverview]);

  return {
    reportType,
    setReportType,
    reportData,
    loadingReport,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    dateRange,
    setDateRange,
    overviewData,
    loadingOverview,
    summaryMetrics,
    searchMeterNo,
    setSearchMeterNo,
    traceability,
    loadingTraceability,
    showExportModal,
    setShowExportModal,
    fetchReport,
    fetchOverview,
    searchTraceability
  };
}
