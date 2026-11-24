import React, { useState, useEffect, useRef } from 'react';
import { jigService, meterService, stageManagementService, stage09Service } from '../../../services/apiServices';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import { Button, Input, Modal, SkeletonTable, Pagination, TableFilterBar, TableFilterSelect, TableStatusSelect } from '../../../components/CommonComponents';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/store';
import { wsClient } from '../../../services/common/websocketService';
import { ALL_STAGE_MODULES, getUserAssignedStages, isFullAccessUser, isSupervisorUser, stripStagePrefix, formatStageDisplay, getSavedStageForUser, saveStageForUser } from '../../../utils/stageUtils';

export default function ProductionOverview() {
  const { user, selectedStageId, setSelectedStageId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStage = searchParams.get('stage') || '';

  const normRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const isOperator =
    normRole === 'OPERATOR' ||
    (normRole.includes('OPERATOR') && !normRole.includes('SUPERVISOR') && !normRole.includes('ADMIN')) ||
    (!isFullAccessUser(user) && !isSupervisorUser(user));

  const isFullAccess = isFullAccessUser(user);
  const assignedStages = getUserAssignedStages(user);
  const assignedStageNumbers = assignedStages.map(s => String(s.id));

  // Determine the active stage selected by the operator (login-time preference or active shift)
  const getOperatorSelectedStage = () => {
    if (selectedStageId && selectedStageId !== 'all') return String(selectedStageId);
    const saved = getSavedStageForUser(user);
    if (saved && saved !== 'all') return String(saved);
    try {
      const sessionVal = sessionStorage.getItem('zenmeter_selected_stage_id');
      if (sessionVal && sessionVal !== 'all') return String(sessionVal);
    } catch (e) {}
    if (assignedStageNumbers.length > 0) return assignedStageNumbers[0];
    if (user?.stage_id) return String(user.stage_id);
    return '9';
  };

  const [jigRecords, setJigRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState(() => {
    if (isOperator) return urlStage || getOperatorSelectedStage();
    if (urlStage) return urlStage;
    if (selectedStageId && selectedStageId !== 'all') return String(selectedStageId);
    if (!isFullAccess && assignedStageNumbers.length > 0) return assignedStageNumbers[0];
    if (user?.stage_id) return String(user.stage_id);
    return '';
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Record View Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Register Meter Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meterNo, setMeterNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [batchNo, setBatchNo] = useState('BATCH-2026-01');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [dbStages, setDbStages] = useState([]);

  // Fetch production stages dynamically from DB
  useEffect(() => {
    stageManagementService.getStages().then(res => {
      const list = Array.isArray(res) ? res : (res?.stages || res?.data || []);
      const active = list.filter(s => s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1');
      if (active.length > 0) {
        setDbStages(active);
      }
    }).catch(e => console.error('Error fetching stages for overview:', e));
  }, []);

  // Keep stage filter in sync with URL parameter, selected stage, or assigned stages
  useEffect(() => {
    if (isOperator) {
      const activeStg = urlStage || getOperatorSelectedStage();
      setStageFilter(activeStg);
      if (setSelectedStageId && activeStg) {
        setSelectedStageId(activeStg);
        saveStageForUser(user, activeStg);
      }
      if (!urlStage && activeStg) {
        setSearchParams({ stage: activeStg }, { replace: true });
      }
      return;
    }
    if (urlStage) {
      setStageFilter(urlStage);
    } else if (selectedStageId && selectedStageId !== 'all') {
      setStageFilter(String(selectedStageId));
    } else if (!isFullAccess && assignedStageNumbers.length === 1) {
      setStageFilter(assignedStageNumbers[0]);
    }
  }, [urlStage, selectedStageId, isFullAccess, isOperator, assignedStageNumbers.length]);

  // Compute user-friendly list of stages for the dropdown
  const availableStages = React.useMemo(() => {
    let list = [];
    if (isFullAccess) {
      list = dbStages.length > 0 ? dbStages : ALL_STAGE_MODULES;
    } else if (assignedStages && assignedStages.length > 0) {
      list = [...assignedStages];
      // If currently active stageFilter is not in assignedStages, include it so dropdown never misaligns
      if (stageFilter && !list.some(s => String(s.stage_number || s.id) === String(stageFilter))) {
        const fallbackStage = (dbStages.length > 0 ? dbStages : ALL_STAGE_MODULES).find(
          s => String(s.stage_number || s.id) === String(stageFilter)
        );
        if (fallbackStage) {
          list.push(fallbackStage);
        }
      }
    } else {
      list = dbStages.length > 0 ? dbStages : ALL_STAGE_MODULES;
    }

    const uniqueMap = new Map();
    list.forEach(stg => {
      const sNum = Number(stg.stage_number || stg.stage_id || stg.id || 1);
      if (!uniqueMap.has(sNum)) {
        const meta = ALL_STAGE_MODULES.find(m => m.id === sNum);
        const cleanName = stripStagePrefix(stg.stage_name || stg.name);
        uniqueMap.set(sNum, {
          ...stg,
          id: sNum,
          stage_number: sNum,
          name: cleanName || meta?.name || `Stage ${sNum}`,
          shortName: stripStagePrefix(stg.shortName) || meta?.shortName || cleanName || `Stage ${sNum}`
        });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.id - b.id);
  }, [isFullAccess, assignedStages, dbStages, stageFilter]);

  // Fetch active work form / work ID assigned to operator for the current stage
  const [activeWorkForm, setActiveWorkForm] = useState(null);

  useEffect(() => {
    if (stageFilter) {
      stageManagementService.getActiveForm({ stage_number: stageFilter, operator_id: user?.employee_id })
        .then(res => {
          setActiveWorkForm(res?.form || res?.data || null);
        })
        .catch(() => setActiveWorkForm(null));
    }
  }, [stageFilter, user]);

  const latestJigReqRef = useRef(0);

  const fetchJigRecords = async () => {
    const reqId = ++latestJigReqRef.current;
    setLoading(true);
    const params = { search, status: statusFilter, role_type: 'OPERATOR' };
    if (stageFilter) {
      params.stage_id = stageFilter;
    }
    if (isOperator && user) {
      params.operator_id = user.employee_id || user.user_name || user.id;
    }

    const shouldFetchJig = !stageFilter || (String(stageFilter) !== '9' && String(stageFilter) !== '7');
    const shouldFetchStage09 = !stageFilter || String(stageFilter) === '9' || String(stageFilter) === '7';

    try {
      const [jigRes, stg9Res] = await Promise.all([
        shouldFetchJig ? jigService.getJigRecords(params).catch(() => []) : Promise.resolve([]),
        shouldFetchStage09
          ? stage09Service
              .getAllRecords({
                role_type: 'OPERATOR',
                ...(stageFilter ? { stage_id: stageFilter } : {}),
                ...(search ? { search } : {}),
                ...(statusFilter ? { status: statusFilter } : {})
              })
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);

      if (reqId === latestJigReqRef.current) {
        const jigData = (Array.isArray(jigRes) ? jigRes : (jigRes?.records || jigRes?.data || [])).map(r => ({
          ...r,
          _recordType: 'jig'
        }));
        const stg9Data = (Array.isArray(stg9Res) ? stg9Res : (stg9Res?.data || stg9Res?.records || [])).map(r => ({
          ...r,
          _recordType: 'stage09',
          stage_id: r.stage_id || 9
        }));

        const combined = [...stg9Data, ...jigData].sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });

        setJigRecords(combined);
        setLoading(false);
        setInitialLoading(false);
      }
    } catch (err) {
      if (reqId === latestJigReqRef.current) {
        console.error('Error fetching production records:', err);
        setLoading(false);
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJigRecords();
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, statusFilter, stageFilter, user]);

  // Real-time WebSocket event listener and auto-refresh for production updates
  useEffect(() => {
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((eventData) => {
      if (
        eventData && (
          eventData.event === 'PRODUCTION_RECORD_UPDATED' ||
          eventData.event === 'STAGE09_RECORD_SAVED' ||
          eventData.event === 'STAGE09_PRINT_UPDATED' ||
          eventData.event === 'STAGE_RESULT_UPDATED' ||
          eventData.event === 'METER_STATUS_CHANGED' ||
          eventData.event === 'JIG_CYCLE_COMPLETE' ||
          eventData.event === 'RECORD_CREATED' ||
          eventData.event === 'NEW_RECORD'
        )
      ) {
        fetchJigRecords();
      }
    });

    const pollTimer = setInterval(() => {
      fetchJigRecords();
    }, 6000);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(pollTimer);
    };
  }, [stageFilter, search, statusFilter]);

  const handleRegisterMeter = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await meterService.createMeter({
        meter_no: meterNo,
        serial_no: serialNo,
        batch_no: batchNo
      });
      setIsModalOpen(false);
      setMeterNo('');
      setSerialNo('');
      fetchJigRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter records by operator, stage & search term
  const filteredRecords = jigRecords.filter(rec => {
    const isStage09Rec = rec._recordType === 'stage09' || Boolean(rec.meter_serial_no);

    // 0. Strict role filter: Stage Production shows ONLY Operator data (exclude Supervisor & QC records)
    const recRoleUpper = String(rec.user_role || rec.operator_role || 'OPERATOR').toUpperCase();
    if (
      recRoleUpper.includes('SUPERVISOR') ||
      recRoleUpper.includes('QC') ||
      recRoleUpper.includes('QUALITY')
    ) {
      return false;
    }

    // 1. Strict operator filter for JIG records; Stage 9 records belong to the stage's assigned Work ID
    if (isOperator && user && !isStage09Rec) {
      const userIdentifiers = [
        user.employee_id,
        user.user_name,
        user.name,
        String(user.id)
      ].filter(Boolean).map(s => String(s).toLowerCase().trim());

      const recOp = String(rec.operator_id || '').toLowerCase().trim();
      const recDisplay = String(rec.operator_display || '').toLowerCase().trim();

      const isMatch = userIdentifiers.some(uid => recOp === uid || recDisplay.includes(uid));
      if (!isMatch) {
        return false;
      }
    }

    // 2. Stage filter
    const recStageStr = String(rec.stage_id || rec.stage_number || rec.stage || (isStage09Rec ? '9' : '4'));

    if (stageFilter) {
      if (recStageStr !== String(stageFilter)) {
        return false;
      }
    } else if (!isFullAccess && assignedStageNumbers.length > 0) {
      // If no stage filter selected, filter by all assigned stages for this user
      if (!assignedStageNumbers.includes(recStageStr)) {
        return false;
      }
    }

    // 3. Search filter
    if (!search) return true;
    const term = search.toLowerCase();
    const hasChannelMatch = (rec.channels || []).some(
      ch => (ch.nic_uuid && ch.nic_uuid.toLowerCase().includes(term)) || (ch.imei && String(ch.imei).includes(term))
    );

    return (
      (rec.cycle_uuid && rec.cycle_uuid.toLowerCase().includes(term)) ||
      (rec.work_id && rec.work_id.toLowerCase().includes(term)) ||
      (rec.meter_serial_no && rec.meter_serial_no.toLowerCase().includes(term)) ||
      (rec.imei_no && String(rec.imei_no).toLowerCase().includes(term)) ||
      (rec.nic_sr_no && String(rec.nic_sr_no).toLowerCase().includes(term)) ||
      (rec.operator_id && rec.operator_id.toLowerCase().includes(term)) ||
      (rec.operator_display && rec.operator_display.toLowerCase().includes(term)) ||
      hasChannelMatch
    );
  });

  // Compute paginated subset of records
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isStage9Selected = String(stageFilter) === '9' || String(stageFilter) === '7';
  const isAllStagesView = !stageFilter;
  const overviewColCount = isStage9Selected ? 9 : (isAllStagesView ? 7 : 8);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  const handleOpenDetailsPage = (rec) => {
    const isStage09Rec = rec._recordType === 'stage09' || Boolean(rec.meter_serial_no);
    const recId = rec.id || rec.cycle_id || rec.cycle_uuid;
    const recType = isStage09Rec ? 'stage09' : 'jig';
    const recStage = rec.stage_id || stageFilter || (isStage09Rec ? 9 : 4);
    navigate(`/stage-production/details-view/${encodeURIComponent(recId)}?type=${recType}&stage=${recStage}`, {
      state: {
        record: rec,
        recordType: recType,
        stageId: recStage,
        workId: rec.work_id || activeWorkForm?.form_id || null,
        workForm: activeWorkForm || null
      }
    });
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-cpu text-primary"></i>
              {stageFilter
                ? `Stage ${stageFilter} Production View`
                : !isFullAccess && assignedStageNumbers.length > 0
                  ? 'Assigned Stages Production View'
                  : 'All Factory Production Stages'}
            </h1>
          </div>
        </div>
      </div>

      {/* Filter Bar with Stage Selector (Stage dropdown hidden for Operator) */}
      <TableFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Cycle ID / Operator / IMEI / NIC UUID..."
        loading={loading && !initialLoading}
        searchMaxWidth={isOperator ? '320px' : '235px'}
        leftExtras={
          !isOperator ? (
            <TableFilterSelect
              value={stageFilter}
              onChange={(val) => {
                setStageFilter(val);
                if (val) {
                  setSearchParams({ stage: val });
                } else {
                  setSearchParams({});
                }
              }}
              icon="ti-subtask"
              iconColorClass="text-primary"
              title="Select Production Stage"
            >
              {isFullAccess ? (
                <>
                  <option value="">All Factory Stages</option>
                  {availableStages.map(stg => (
                    <option key={stg.id} value={String(stg.id)}>
                      Stage {stg.id}: {stg.name}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  {availableStages.length > 1 && (
                    <option value="">All Assigned Stages</option>
                  )}
                  {availableStages.map(stg => (
                    <option key={stg.id} value={String(stg.id)}>
                      Stage {stg.id}: {stg.name}
                    </option>
                  ))}
                </>
              )}
            </TableFilterSelect>
          ) : null
        }
        rightExtras={
          <>
            <TableStatusSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'ALL STATUSES' },
                { value: 'PASS', label: 'PASS / CON' },
                { value: 'FAIL', label: 'FAIL' },
                { value: 'DUPLICATE', label: 'DUPLICATE' }
              ]}
            />
            <button
              type="button"
              className="btn btn-sm btn-light border text-nowrap flex-shrink-0 d-inline-flex align-items-center gap-1"
              onClick={fetchJigRecords}
              title="Refresh Data"
            >
              <i className="ti ti-refresh text-primary"></i>
              <span>Refresh</span>
            </button>
          </>
        }
      />

      {/* JIG Records Table - Grouped by Cycle ID */}
      {initialLoading || loading ? (
        <SkeletonTable rows={6} columns={overviewColCount} />
      ) : (
        <div className="card shadow-xs table-card">
          <div className="table-responsive">
            <div className="table-swipe-hint d-md-none">
              <i className="ti ti-arrows-left-right text-primary me-1"></i>
              <span>Swipe horizontally to view all columns</span>
            </div>
            <table className="table mb-0 align-middle table-hover text-nowrap">
              <thead className="table-light">
                {isStage9Selected ? (
                  <tr>
                    <th style={{ width: '60px' }} className="text-center">S.No</th>
                    <th>Work ID</th>
                    <th>Meter Serial No</th>
                    <th>IMEI No</th>
                    <th>NIC Sr.No</th>
                    <th>Print</th>
                    <th>Operator / User</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: '60px' }} className="text-center">S.No</th>
                    <th>Cycle / Work ID</th>
                    <th>Current Stage</th>
                    {!isAllStagesView && <th>Details / Channels</th>}
                    <th>Operator / User</th>
                    <th>Status</th>
                    <th>Saved Timestamp</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((r, index) => {
                    const serialNoIndex = (currentPage - 1) * pageSize + index + 1;
                    const isStage09Rec = r._recordType === 'stage09' || Boolean(r.meter_serial_no);

                    if (isStage9Selected && isStage09Rec) {
                      return (
                        <tr key={r.id || `stg9-${index}`}>
                          <td className="text-center fw-bold text-muted">{serialNoIndex}</td>
                          <td>
                            <span className="badge bg-light text-primary border font-mono px-2.5 py-1">
                              {r.work_id || activeWorkForm?.form_id || 'WORK-STG9-001'}
                            </span>
                          </td>
                          <td className="fw-bold text-primary font-mono">
                            {r.meter_serial_no || '-'}
                          </td>
                          <td className="font-mono text-success fw-semibold">
                            {r.imei_no || '-'}
                          </td>
                          <td className="font-mono text-dark">
                            {r.nic_sr_no || '-'}
                          </td>
                          <td>
                            {r.print ? (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fw-bold text-lowercase">
                                {r.print}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1.5">
                              <i className="ti ti-user text-primary fs-6"></i>
                              <span className="fw-semibold text-dark">
                                {r.operator_display || (r.operator_id ? `${r.operator_id}` : (user?.name ? `${user.name} (${user.employee_id || ''})` : 'Operator'))}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fw-bold">
                              <i className="ti ti-circle-check me-1"></i>
                              {r.status || 'PASS'}
                            </span>
                          </td>
                          <td className="text-end pe-4">
                            <button
                              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 fw-semibold px-3"
                              onClick={() => handleOpenDetailsPage(r)}
                            >
                              <i className="ti ti-eye fs-6"></i>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const passedCnt = r.passed_channels !== undefined ? r.passed_channels : (r.channels || []).filter(c => c.status === 'PASS').length;
                    const totalCnt = r.total_channels || 8;
                    const stageLabel = formatStageDisplay(
                      r.stage_id || (isStage09Rec ? 9 : 4),
                      r.stage_name,
                      isStage09Rec ? 'Meter Box Body Print' : 'NIC Card Inside Print'
                    );

                    return (
                      <tr key={r.id || r.cycle_uuid || `cycle-${index}`}>
                        <td className="text-center fw-bold text-muted">{serialNoIndex}</td>
                        <td>
                          <span className="badge bg-light text-primary border font-mono px-2.5 py-1">
                            {isStage09Rec
                              ? (r.work_id || activeWorkForm?.form_id || 'WORK-STG9-001')
                              : (r.cycle_uuid || `ZMRJIG${String(r.cycle_id || 1).padStart(4, '0')}`)}
                          </span>
                        </td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-1.5 fw-semibold text-dark">
                            <i className={`ti ${isStage09Rec ? 'ti-printer' : 'ti-cpu'} text-primary fs-6`}></i>
                            <span>{stageLabel}</span>
                          </div>
                        </td>
                        {!isAllStagesView && (
                          <td>
                            {isStage09Rec ? (
                              <span className="badge bg-primary-subtle text-primary fw-bold font-mono px-2.5 py-1">
                                Sr.No: {r.meter_serial_no || '-'}
                              </span>
                            ) : (
                              <span className="badge bg-primary-subtle text-primary fw-bold px-2.5 py-1.5">
                                <i className="ti ti-cpu me-1"></i>
                                {passedCnt} / {totalCnt} Channels Passed
                              </span>
                            )}
                          </td>
                        )}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <i className="ti ti-user text-primary fs-6"></i>
                            <span className="fw-semibold text-dark">
                              {r.operator_display || (r.operator_id ? `${r.operator_id}` : (user?.name ? `${user.name} (${user.employee_id || ''})` : 'Operator'))}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fw-bold">
                            <i className="ti ti-circle-check me-1"></i>
                            {r.status || 'PASS'}
                          </span>
                        </td>
                        <td className="small text-muted font-mono">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="text-end pe-4">
                          <button
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 fw-semibold px-3"
                            onClick={() => handleOpenDetailsPage(r)}
                          >
                            <i className="ti ti-eye fs-6"></i>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={overviewColCount} className="text-center py-5 text-muted">
                      <i className="ti ti-folder-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold">
                        {isOperator
                          ? `No test records found for ${user?.name || 'Operator'} (${user?.employee_id || ''}) in Stage ${stageFilter || 'Selected'}`
                          : 'No production records found matching filters'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Record View Full 8-Channel Telemetry Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={`Stage ${selectedRecord.stage_id || stageFilter || 4} Hardware Telemetry View - ${selectedRecord.cycle_uuid || 'ZMRJIG0025'}`}
          size="xl"
        >
          <div className="p-2">
            {/* Cycle Header & Summary Bar */}
            <div className="d-flex justify-content-between align-items-center p-3 mb-4 rounded-3 bg-light border flex-wrap gap-2 shadow-2xs">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-primary px-3 py-2 fw-bold fs-6">
                  <i className="ti ti-cpu me-1"></i>
                  {selectedRecord.cycle_uuid || `ZMRJIG${String(selectedRecord.cycle_id || 25).padStart(4, '0')}`}
                </span>
                <span className="badge bg-success-subtle text-success border border-success px-2.5 py-1.5 fw-semibold">
                  <i className="ti ti-check me-1"></i>
                  {(selectedRecord.passed_channels !== undefined ? selectedRecord.passed_channels : (selectedRecord.channels || []).filter(c => c.status === 'PASS').length)} / {selectedRecord.total_channels || 8} Passed
                </span>
                <span className="badge bg-success px-2.5 py-1.5 fw-semibold text-white">
                  <i className="ti ti-database-check me-1"></i> DB SAVED
                </span>
              </div>
              <div className="text-end">
                <div className="small fw-bold text-dark">
                  <i className="ti ti-user me-1 text-primary"></i>
                  Operator: {selectedRecord.operator_display || selectedRecord.operator_id || (user?.name ? `${user.name} (${user.employee_id || ''})` : 'Operator')}
                </div>
                <div className="small text-muted font-mono">
                  Tested: {formatDate(selectedRecord.created_at)}
                </div>
              </div>
            </div>

            {/* 8-Channel Hardware Telemetry Output Grid */}
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="ti ti-layout-grid text-primary fs-5"></i>
              <span>8-Channel Hardware Telemetry Output for {selectedRecord.cycle_uuid}</span>
            </h6>

            <div className="row g-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((chNo) => {
                const chList = selectedRecord.channels || [];
                const chData = chList.find(c => c.channel_no === chNo || c.ch === chNo) || {};

                const statusStr = chData.status || 'NCON';
                const isPass = statusStr === 'PASS' || statusStr === 'CON';
                const isDup = statusStr === 'DUPLICATE';

                const nicUuid = chData.nic_uuid || (isPass ? `ZMRDNIC000${chNo}` : '-');
                const imeiVal = chData.imei || '-';
                const hwvVal = chData.hwv || (isPass ? 'v1.2' : '-');
                const fwvVal = chData.fwv || (isPass ? 'v2.0' : '-');
                const sigVal = chData.sig || (isPass ? '-65dBm' : '-');

                return (
                  <div className="col-lg-3 col-md-6 col-12" key={`ch-${chNo}`}>
                    <div
                      className={`border rounded-3 p-3 h-100 bg-white shadow-2xs transition-all ${isPass ? 'border-success border-2 shadow-sm' : isDup ? 'border-warning border-2' : ''}`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                        <span className="fw-bold small text-dark d-flex align-items-center gap-1.5">
                          <i className="ti ti-box text-warning fs-6"></i>
                          <span>Channel {chNo}</span>
                        </span>
                        <span className={`badge ${isPass ? 'bg-success text-white' : (isDup ? 'bg-warning text-dark' : 'bg-secondary text-white')} px-2.5 py-1 font-mono text-uppercase`} style={{ fontSize: '11px' }}>
                          {isPass ? '✓ PASS' : (isDup ? 'DUPLICATE' : 'NCON')}
                        </span>
                      </div>

                      <div className="font-mono space-y-1" style={{ fontSize: '12px', lineHeight: '1.7' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">nic_uuid:</span>
                          <span className={`fw-bold font-mono ${nicUuid && nicUuid !== '-' ? 'text-primary' : 'text-muted'}`}>{nicUuid}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">imei:</span>
                          <span className={`fw-semibold font-mono ${isDup ? 'text-warning text-dark' : 'text-dark'}`}>{imeiVal}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">hwv:</span>
                          <span className="text-dark">{hwvVal}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">fwv:</span>
                          <span className="text-dark">{fwvVal}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">sig:</span>
                          <span className="text-dark font-mono">{sigVal}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1.5 pt-1.5 border-top border-dashed">
                          <span className="text-muted">DB Status:</span>
                          {isPass && nicUuid ? (
                            <span className="badge bg-success-subtle text-success border border-success px-2 py-0.5 fw-semibold" style={{ fontSize: '10px' }}>
                              SAVED
                            </span>
                          ) : isDup ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-0.5 fw-semibold" style={{ fontSize: '10px' }}>
                              DUPLICATE / SKIPPED
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="d-flex justify-content-end pt-2">
              <button className="btn btn-secondary px-4 py-2 fw-bold" type="button" onClick={() => setSelectedRecord(null)}>
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Meter Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Production Meter">
        <form onSubmit={handleRegisterMeter}>
          {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
          <Input
            label="Meter No"
            placeholder="e.g. MTR000013"
            value={meterNo}
            onChange={(e) => setMeterNo(e.target.value)}
            required
          />
          <Input
            label="Serial No"
            placeholder="e.g. SN-2026-0013"
            value={serialNo}
            onChange={(e) => setSerialNo(e.target.value)}
            required
          />
          <Input
            label="Batch No"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            required
          />
          <div className="d-flex justify-content-end gap-2 pt-3">
            <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Meter'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
