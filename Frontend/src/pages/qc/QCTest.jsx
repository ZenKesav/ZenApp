import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { qcTestService, stageManagementService, stage09Service, jigService } from '../../services/apiServices';
import { Modal, SkeletonTable, Pagination, TableFilterBar, TableFilterSelect, TableStatusSelect } from '../../components/CommonComponents';
import { useAuth } from '../../app/store';
import { ALL_STAGE_MODULES, formatStageDisplay } from '../../utils/stageUtils';

export default function QCTest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const rawRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const isQC = rawRole === 'QC' || rawRole.includes('QC') || rawRole.includes('QUALITY');
  const isAdmin = rawRole === 'ADMIN' || rawRole.includes('ADMIN') || rawRole.includes('IT');

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Record View Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Active Assigned Stage Work Order
  const [activeStageWorkOrder, setActiveStageWorkOrder] = useState(null);

  useEffect(() => {
    const targetStage = stageFilter || '9';
    stageManagementService.getActiveForm({ stage_number: targetStage })
      .then(res => {
        setActiveStageWorkOrder(res?.form || res?.data || null);
      })
      .catch(() => setActiveStageWorkOrder(null));
  }, [stageFilter]);

  if (!isAdmin && !isQC) {
    return (
      <div className="card shadow-sm border-0 my-4 text-center py-5 bg-white">
        <div className="card-body">
          <i className="ti ti-lock-access fs-1 text-danger d-block mb-3"></i>
          <h4 className="fw-bold text-dark mb-1">QC Access Restricted</h4>
          <p className="text-secondary mb-0">
            The QC Test Portal is accessible exclusively by Quality Control Inspectors and System Administrators.
          </p>
        </div>
      </div>
    );
  }

  const latestQcReqRef = useRef(0);

  const fetchQcTests = async () => {
    const reqId = ++latestQcReqRef.current;
    setLoading(true);

    const shouldFetchStage09 = !stageFilter || String(stageFilter) === '9' || String(stageFilter) === '7';
    const shouldFetchJig = !stageFilter || (String(stageFilter) !== '9' && String(stageFilter) !== '7');

    try {
      const [qcRes, stg9Res, jigRes] = await Promise.all([
        qcTestService.getTests({
          stage_id: stageFilter,
          status: statusFilter,
          search
        }).catch(() => []),
        shouldFetchStage09
          ? stage09Service.getAllRecords({
              role_type: 'QC',
              ...(stageFilter ? { stage_id: stageFilter } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(search ? { search } : {})
            }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        shouldFetchJig
          ? jigService.getJigRecords({
              role_type: 'QC',
              ...(stageFilter ? { stage_id: stageFilter } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(search ? { search } : {})
            }).catch(() => [])
          : Promise.resolve([])
      ]);

      if (reqId !== latestQcReqRef.current) return;

      const qcList = Array.isArray(qcRes) ? qcRes : (qcRes?.tests || qcRes?.data || []);
      const stg9List = (Array.isArray(stg9Res) ? stg9Res : (stg9Res?.data || stg9Res?.records || [])).map(r => ({
        ...r,
        _recordType: 'stage09',
        stage_id: r.stage_id || 9,
        qc_id: r.operator_id || 'QC',
        qc_name: r.operator_name || r.operator_id || 'QC Inspector',
        qc_display: r.operator_display || (r.operator_name ? `${r.operator_name} (${r.operator_id})` : r.operator_id)
      }));
      const jigList = (Array.isArray(jigRes) ? jigRes : (jigRes?.records || jigRes?.data || [])).map(r => ({
        ...r,
        _recordType: 'jig',
        qc_id: r.operator_id || 'QC',
        qc_name: r.operator_name || r.operator_id || 'QC Inspector',
        qc_display: r.operator_display || (r.operator_name ? `${r.operator_name} (${r.operator_id})` : r.operator_id)
      }));

      // Deduplicate any qc_tests rows that mirror a stage09_meter_records row
      const stage09Ids = new Set(stg9List.map(r => Number(r.id)));
      const normalizedQc = qcList
        .filter(item => {
          let idata = item.inspection_data || item.test_details;
          if (typeof idata === 'string') {
            try { idata = JSON.parse(idata); } catch (e) { idata = null; }
          }
          if (idata && idata.record_id && stage09Ids.has(Number(idata.record_id))) {
            return false;
          }
          return true;
        })
        .map(item => {
          let idata = item.inspection_data || item.test_details;
          if (typeof idata === 'string') {
            try { idata = JSON.parse(idata); } catch (e) { idata = {}; }
          }
          return {
            ...item,
            inspection_data: item.inspection_data || item.test_details,
            _recordType: idata?.meter_serial_no ? 'stage09' : 'qc_test',
            work_id: item.work_id || idata?.work_id || item.batch_no || null,
            meter_serial_no: item.meter_serial_no || idata?.meter_serial_no || item.serial_no || item.meter_no || null,
            imei_no: item.imei_no || idata?.imei_no || null,
            nic_sr_no: item.nic_sr_no || idata?.nic_sr_no || null,
            print: item.print || idata?.print || null,
            print_at: item.print_at || idata?.print_at || null,
            qc_display: item.qc_name ? `${item.qc_name} (${item.qc_id})` : item.qc_id
          };
        });

      const combined = [...stg9List, ...jigList, ...normalizedQc].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });

      setTests(combined);
      setLoading(false);
      setInitialLoading(false);
    } catch (err) {
      if (reqId === latestQcReqRef.current) {
        console.error('Error fetching QC Test records:', err);
        setTests([]);
        setLoading(false);
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQcTests();
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, statusFilter, stageFilter]);

  // Filter local tests list
  const filteredRecords = tests.filter(rec => {
    if (stageFilter && String(rec.stage_id) !== String(stageFilter)) {
      return false;
    }
    if (statusFilter && String(rec.status || 'PASS').toUpperCase() !== String(statusFilter).toUpperCase()) {
      return false;
    }
    if (search) {
      const term = search.toLowerCase();
      const matchWork = rec.work_id && String(rec.work_id).toLowerCase().includes(term);
      const matchMeter = rec.meter_no && String(rec.meter_no).toLowerCase().includes(term);
      const matchSerial = (rec.meter_serial_no || rec.serial_no) && String(rec.meter_serial_no || rec.serial_no).toLowerCase().includes(term);
      const matchImei = rec.imei_no && String(rec.imei_no).toLowerCase().includes(term);
      const matchNic = rec.nic_sr_no && String(rec.nic_sr_no).toLowerCase().includes(term);
      const matchCycle = rec.cycle_uuid && String(rec.cycle_uuid).toLowerCase().includes(term);
      const matchQc = rec.qc_name && String(rec.qc_name).toLowerCase().includes(term);
      const matchEmp = rec.qc_id && String(rec.qc_id).toLowerCase().includes(term);
      return matchWork || matchMeter || matchSerial || matchImei || matchNic || matchCycle || matchQc || matchEmp;
    }
    return true;
  });

  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const handleViewRecord = (r) => {
    if (r._recordType === 'stage09' || r._recordType === 'jig') {
      const recId = r.id || r.cycle_id || r.cycle_uuid;
      const recType = r._recordType === 'stage09' ? 'stage09' : 'jig';
      const recStage = r.stage_id || (recType === 'stage09' ? 9 : 4);
      navigate(`/stage-production/details-view/${encodeURIComponent(recId)}?type=${recType}&stage=${recStage}`, {
        state: {
          record: r,
          recordType: recType,
          stageId: recStage,
          workId: r.work_id || activeStageWorkOrder?.form_id || null,
          workForm: activeStageWorkOrder || null,
          from: '/qc-test',
          fromLabel: 'Back to QC Test'
        }
      });
    } else {
      setSelectedRecord(r);
    }
  };

  return (
    <>
      {/* Header Bar */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="ti ti-shield-check text-success"></i>
            QC Stage Test Portal
          </h1>
        </div>
      </div>

      {/* Filter Bar */}
      <TableFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Work ID / Meter Serial No / IMEI / QC Inspector..."
        loading={loading && !initialLoading}
        spinnerClassName="text-success"
        leftExtras={
          <TableFilterSelect
            value={stageFilter}
            onChange={setStageFilter}
            icon="ti-subtask"
            iconColorClass="text-success"
            title="Filter by Stage"
          >
            <option value="">All Factory Stages</option>
            {ALL_STAGE_MODULES.map(stg => (
              <option key={stg.id} value={String(stg.id)}>
                Stage {stg.id}: {stg.name}
              </option>
            ))}
          </TableFilterSelect>
        }
        rightExtras={
          <>
            <TableStatusSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'ALL STATUSES' },
                { value: 'PASS', label: 'PASS' },
                { value: 'FAIL', label: 'FAIL' },
                { value: 'REJECTED', label: 'REJECTED' },
                { value: 'HOLD', label: 'HOLD' }
              ]}
            />
            <button
              type="button"
              className="btn btn-sm btn-light border text-nowrap flex-shrink-0 d-inline-flex align-items-center gap-1"
              onClick={fetchQcTests}
              title="Refresh Data"
            >
              <i className="ti ti-refresh text-success"></i>
              <span>Refresh</span>
            </button>
          </>
        }
      />

      {/* Active Assigned Stage Work Order Banner */}
      {activeStageWorkOrder && (
        <div className="card shadow-2xs border-0 mb-3 bg-white border-start border-success border-3">
          <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge bg-success text-white font-mono px-3 py-1.5 fs-6 shadow-2xs d-inline-flex align-items-center gap-1.5">
                <i className="ti ti-id-badge"></i>
                <span>Work ID: <strong>{activeStageWorkOrder.form_id}</strong></span>
              </span>
              <span className="text-muted small font-mono">
                Batch: <strong className="text-dark">{activeStageWorkOrder.batch_no}</strong>
                {activeStageWorkOrder.month_year && <> &bull; Date: <strong className="text-dark">{activeStageWorkOrder.month_year}</strong></>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* QC Test Records Table */}
      {initialLoading || loading ? (
        <SkeletonTable rows={6} columns={11} />
      ) : (
        <div className="card shadow-xs table-card">
          <div className="table-responsive">
            <div className="table-swipe-hint d-md-none">
              <i className="ti ti-arrows-left-right text-primary me-1"></i>
              <span>Swipe horizontally to view all columns</span>
            </div>
            <table className="table mb-0 align-middle table-hover text-nowrap">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>S.No</th>
                  <th>Work ID / Cycle ID</th>
                  <th>Meter Serial No</th>
                  <th>IMEI No</th>
                  <th>NIC Sr.No</th>
                  <th>Testing Stage</th>
                  <th>QC Inspector Details</th>
                  <th>Print Status</th>
                  <th>Status</th>
                  <th>Saved Timestamp</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((r, index) => {
                    const serialNoIndex = (currentPage - 1) * pageSize + index + 1;
                    const isPass = (r.status || 'PASS') === 'PASS';
                    const isFail = r.status === 'FAIL' || r.status === 'REJECTED';
                    const isStage09Rec = r._recordType === 'stage09' || Boolean(r.meter_serial_no);
                    const isPrinted = Boolean(r.print && String(r.print).toLowerCase() === 'printed');

                    return (
                      <tr key={`${r._recordType || 'qc'}-${r.id || r.cycle_id || index}`}>
                        <td className="fw-bold text-muted">{serialNoIndex}</td>
                        <td className="fw-bold text-dark">
                          <span className="badge bg-light text-success border font-mono px-2.5 py-1">
                            <i className={`ti ${isStage09Rec ? 'ti-id-badge' : 'ti-cpu'} me-1`}></i>
                            {r.work_id || r.cycle_uuid || r.meter_no || `QC-${r.id}`}
                          </span>
                        </td>
                        <td className="font-mono fw-bold text-dark">
                          {r.meter_serial_no || r.serial_no || (r._recordType === 'jig' ? `${r.passed_channels || 0}/${r.total_channels || 8} Ch` : '-')}
                        </td>
                        <td className="font-mono small text-success fw-semibold">
                          {r.imei_no || '-'}
                        </td>
                        <td className="font-mono small text-dark">
                          {r.nic_sr_no || '-'}
                        </td>
                        <td className="fw-semibold text-secondary">
                          {formatStageDisplay(r.stage_id, r.stage_name)}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <i className="ti ti-shield-check text-success fs-6"></i>
                            <span className="fw-semibold text-dark">{r.qc_name || r.operator_name || 'QC Inspector'}</span>
                            <small className="text-muted font-mono">({r.qc_id || r.operator_id})</small>
                          </div>
                        </td>
                        <td>
                          {isStage09Rec ? (
                            isPrinted ? (
                              <div>
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 font-mono">
                                  <i className="ti ti-printer me-1"></i>printed
                                </span>
                                {r.print_at && (
                                  <small className="d-block text-muted font-mono mt-0.5" style={{ fontSize: '11px' }}>
                                    {formatDate(r.print_at)}
                                  </small>
                                )}
                              </div>
                            ) : (
                              <span className="badge bg-light text-muted border px-2 py-0.5 font-mono">null</span>
                            )
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${isPass ? 'bg-success-subtle text-success border border-success-subtle' : isFail ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} px-2.5 py-1 fw-bold`}>
                            <i className={`ti ${isPass ? 'ti-circle-check' : isFail ? 'ti-alert-circle' : 'ti-clock-pause'} me-1`}></i>
                            {r.status || 'PASS'}
                          </span>
                        </td>
                        <td className="small text-muted font-mono">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="text-end pe-4">
                          <button
                            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 fw-semibold px-3"
                            onClick={() => handleViewRecord(r)}
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
                    <td colSpan="11" className="text-center py-5 text-muted">
                      <i className="ti ti-folder-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold fs-6 text-dark d-block mb-1">Data not found</span>
                      <small className="text-muted">No QC test records found matching the selected filters in database.</small>
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

      {/* View Record Details Modal (for non-stage09/jig generic QC records) */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={`QC Test Record #${selectedRecord.id} - ${selectedRecord.meter_no || selectedRecord.meter_serial_no || ''}`}
          size="lg"
        >
          <div className="p-2">
            <div className="d-flex justify-content-between align-items-center p-3 mb-3 rounded-3 bg-light border">
              <div>
                <span className="badge bg-success px-3 py-1.5 fw-bold fs-6 me-2">
                  {selectedRecord.meter_no || selectedRecord.work_id || `QC-${selectedRecord.id}`}
                </span>
                <span className="badge bg-outline-secondary px-2.5 py-1 text-dark border">
                  SN: {selectedRecord.meter_serial_no || selectedRecord.serial_no || 'N/A'}
                </span>
              </div>
              <div>
                <span className={`badge ${selectedRecord.status === 'PASS' ? 'bg-success' : (selectedRecord.status === 'FAIL' || selectedRecord.status === 'REJECTED') ? 'bg-danger' : 'bg-warning text-dark'} px-3 py-1.5 fw-bold fs-6`}>
                  {selectedRecord.status}
                </span>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="p-3 border rounded bg-white">
                  <small className="text-muted text-uppercase fw-bold d-block mb-1">QC Inspector Info</small>
                  <div className="fw-bold text-dark">{selectedRecord.qc_name}</div>
                  <div className="text-muted font-mono small">Employee ID: {selectedRecord.qc_id}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 border rounded bg-white">
                  <small className="text-muted text-uppercase fw-bold d-block mb-1">Testing Stage</small>
                  <div className="fw-bold text-success">{selectedRecord.stage_name}</div>
                  <div className="text-muted font-mono small">Saved: {formatDate(selectedRecord.created_at)}</div>
                </div>
              </div>
            </div>

            <div className="p-3 border rounded bg-light mb-3 font-mono" style={{ fontSize: '13px' }}>
              <div className="fw-bold text-dark mb-2">Recorded QC Inspection Parameters:</div>
              <pre className="mb-0 text-dark bg-white p-2.5 rounded border">
                {(() => {
                  try {
                    const parsed = typeof selectedRecord.inspection_data === 'string' ? JSON.parse(selectedRecord.inspection_data) : selectedRecord.inspection_data;
                    return JSON.stringify(parsed, null, 2);
                  } catch (e) {
                    return String(selectedRecord.inspection_data || 'No extra inspection data');
                  }
                })()}
              </pre>
            </div>

            {selectedRecord.remarks && (
              <div className="p-3 border rounded bg-white mb-3">
                <small className="text-muted text-uppercase fw-bold d-block mb-1">QC Inspector Remarks</small>
                <div className="text-dark small">{selectedRecord.remarks}</div>
              </div>
            )}

            <div className="d-flex justify-content-end pt-2">
              <button className="btn btn-secondary px-4" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
