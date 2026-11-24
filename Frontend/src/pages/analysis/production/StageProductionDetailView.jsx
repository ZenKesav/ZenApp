import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { stage09Service, jigService, stageManagementService } from '../../../services/apiServices';
import { LoadingSpinner } from '../../../components/CommonComponents';
import { useAuth } from '../../../app/store';

export default function StageProductionDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const recordTypeParam = searchParams.get('type') || location.state?.recordType || '';
  const stageIdParam = searchParams.get('stage') || location.state?.stageId || '';
  const workIdParam = searchParams.get('workId') || location.state?.workId || '';
  const returnToPath =
    location.state?.from ||
    searchParams.get('from') ||
    (stageIdParam ? `/stage-production?stage=${stageIdParam}` : '/stage-production');
  const returnToLabel =
    location.state?.fromLabel ||
    (String(returnToPath).includes('supervisor-test')
      ? 'Back'
      : String(returnToPath).includes('qc-test')
      ? 'Back'
      : 'Back');

  const [record, setRecord] = useState(location.state?.record || null);
  const [workForm, setWorkForm] = useState(location.state?.workForm || null);
  const [loading, setLoading] = useState(!location.state?.record);
  const [error, setError] = useState('');

  const formatDateTime = (dateStr) => {
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

  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      setLoading(true);
      setError('');
      try {
        let fetchedRecord = location.state?.record || null;
        const isStage9Type =
          recordTypeParam === 'stage09' ||
          String(stageIdParam) === '9' ||
          String(stageIdParam) === '7' ||
          Boolean(fetchedRecord?.meter_serial_no);

        if (isStage9Type && id) {
          const res = await stage09Service.getRecordById(id).catch(() => null);
          if (res?.success && res?.data) {
            fetchedRecord = { ...res.data, _recordType: 'stage09' };
          }
        } else if (id) {
          // Try Stage 9 record by ID first if numeric, or JIG records
          const jigRes = await jigService.getJigRecords({ search: id }).catch(() => null);
          const jigList = Array.isArray(jigRes) ? jigRes : (jigRes?.records || jigRes?.data || []);
          const matchedJig = jigList.find(
            r => String(r.id) === String(id) || String(r.cycle_id) === String(id) || String(r.cycle_uuid) === String(id)
          );
          if (matchedJig) {
            fetchedRecord = { ...matchedJig, _recordType: 'jig' };
          } else {
            const stg9Res = await stage09Service.getRecordById(id).catch(() => null);
            if (stg9Res?.success && stg9Res?.data) {
              fetchedRecord = { ...stg9Res.data, _recordType: 'stage09' };
            }
          }
        }

        if (isMounted) {
          if (fetchedRecord) {
            setRecord(fetchedRecord);
            const targetWorkId = fetchedRecord.work_id || workIdParam;
            const targetStageNum = fetchedRecord.stage_id || stageIdParam;
            if (targetWorkId || targetStageNum) {
              const formsRes = await stageManagementService
                .getForms(targetStageNum ? { stage_number: targetStageNum } : {})
                .catch(() => null);
              const formsList = Array.isArray(formsRes) ? formsRes : (formsRes?.forms || formsRes?.data || []);
              const foundForm = formsList.find(
                f =>
                  (targetWorkId && String(f.form_id) === String(targetWorkId)) ||
                  (Boolean(f.assigned_operator_id) && f.status !== 'DE-ACTIVE')
              );
              if (foundForm && isMounted) {
                setWorkForm(foundForm);
              }
            }
          } else {
            setError('Production record details not found.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load production record details.');
          setLoading(false);
        }
      }
    }

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [id, recordTypeParam, stageIdParam, workIdParam]);

  if (loading) {
    return <LoadingSpinner text="Loading Stage Production Record Details..." />;
  }

  if (error || !record) {
    return (
      <div className="card p-5 text-center shadow-sm my-4 border-0">
        <i className="ti ti-file-off fs-1 text-danger mb-3 opacity-75"></i>
        <h4 className="fw-bold text-dark mb-2">Production Record Not Found</h4>
        <p className="text-secondary mb-4">{error || `Record #${id} could not be found.`}</p>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(returnToPath)}
          >
            <i className="ti ti-arrow-left me-1"></i> {returnToLabel}
          </button>
        </div>
      </div>
    );
  }

  const isMeterPrintRecord =
    record._recordType === 'stage09' ||
    Boolean(record.meter_serial_no) ||
    String(record.stage_id) === '9' ||
    String(record.stage_id) === '7';

  const effectiveWorkId = record.work_id || workForm?.form_id || '-';
  const effectiveBatchNo = record.batch_no || workForm?.batch_no || '-';
  const effectiveMonthYear = record.month_year || workForm?.month_year || '-';
  const effectiveFormTitle = record.form_title || workForm?.form_title || record.stage_name || 'Meter Box Body Print Work Order';
  const effectiveTargetQty = record.target_quantity || workForm?.target_quantity || '-';
  const effectiveCompletedQty = record.completed_quantity ?? workForm?.completed_quantity ?? '-';
  const effectiveStageId = record.stage_id || workForm?.stage_number || stageIdParam || '-';
  const effectiveStageName = record.stage_name || workForm?.stage_name || `Stage ${effectiveStageId}`;
  const isPrinted = Boolean(record.print && String(record.print).toLowerCase() === 'printed');
  const printAtVal = record.print_at || record.printAt || null;

  return (
    <div className="container-fluid px-0 pb-4 font-sans">
      {/* Top Header Summary Card */}
      <div className="card border shadow-sm p-4 mb-4 rounded-3 bg-white">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold fs-3 shadow-sm"
              style={{ width: '56px', height: '56px' }}
            >
              <i className={`ti ${isMeterPrintRecord ? 'ti-printer' : 'ti-cpu'}`}></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h3 className="mb-0 text-dark fw-bold">
                  {isMeterPrintRecord
                    ? `Meter S/N: ${record.meter_serial_no}`
                    : `Cycle ID: ${record.cycle_uuid || `ZMRJIG${String(record.cycle_id || record.id).padStart(4, '0')}`}`}
                </h3>
                <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6">
                  Stage #{effectiveStageId}
                </span>
                <span className="badge bg-success-subtle text-success border border-success px-2.5 py-1 fs-6">
                  <i className="ti ti-circle-check me-1"></i>
                  {record.status || 'PASS'}
                </span>
                {isMeterPrintRecord && (
                  <span
                    className={`badge px-2.5 py-1 fs-6 ${
                      isPrinted
                        ? 'bg-primary-subtle text-primary border border-primary-subtle'
                        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                    }`}
                  >
                    <i className={`ti ${isPrinted ? 'ti-printer' : 'ti-clock'} me-1`}></i>
                    {isPrinted ? 'Printed' : 'Print Pending'}
                  </span>
                )}
              </div>
              <div className="text-secondary small d-flex align-items-center gap-2 flex-wrap">
                <span>{effectiveStageName}</span>
                {effectiveWorkId && effectiveWorkId !== '-' && (
                  <>
                    <span>&bull;</span>
                    <span>
                      Work ID: <strong className="text-primary font-mono">{effectiveWorkId}</strong>
                    </span>
                  </>
                )}
                {effectiveBatchNo && effectiveBatchNo !== '-' && (
                  <>
                    <span>&bull;</span>
                    <span>
                      Batch: <strong className="text-dark font-mono">{effectiveBatchNo}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-inline-flex align-items-center px-3 py-1.5 rounded-2"
              onClick={() => navigate(returnToPath)}
            >
              <i className="ti ti-arrow-left me-1.5"></i> {returnToLabel}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Work Order / Work ID Details Card */}
      <div className="card shadow-sm border mb-4">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-id-badge fs-4 text-primary"></i>
            <h5 className="mb-0 fw-bold text-dark">Work Order & Stage Information</h5>
          </div>
          {effectiveWorkId && effectiveWorkId !== '-' && (
            <span className="badge bg-primary text-white font-mono px-3 py-1.5 fs-6">
              Work ID: {effectiveWorkId}
            </span>
          )}
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Work ID / Form ID</span>
              <strong className="text-primary font-mono fs-6">{effectiveWorkId}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Work Order Title</span>
              <strong className="text-dark">{effectiveFormTitle}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Batch Number</span>
              <strong className="text-dark font-mono">{effectiveBatchNo}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Manufacturing Date (MM/YYYY)</span>
              <strong className="text-dark font-mono">{effectiveMonthYear}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Production Stage</span>
              <strong className="text-dark">{effectiveStageName}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">
                {String(record.user_role || record.operator_role || '').toUpperCase().includes('SUPERVISOR')
                  ? 'Supervisor Details'
                  : String(record.user_role || record.operator_role || '').toUpperCase().includes('QC')
                  ? 'QC Inspector Details'
                  : 'Operator Details'}
              </span>
              <strong className="text-dark">
                {record.supervisor_display ||
                  record.qc_display ||
                  record.operator_display ||
                  record.operator_id ||
                  (user?.name ? `${user.name} (${user.employee_id || ''})` : 'Operator')}
              </strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Target / Completed Quantity</span>
              <strong className="text-dark font-mono">
                {effectiveCompletedQty} / {effectiveTargetQty} Meters
              </strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block mb-1">Record Saved Timestamp</span>
              <strong className="text-secondary font-mono small">{formatDateTime(record.created_at)}</strong>
            </div>
          </div>

          {(workForm || record.work_created_by || record.work_created_at) && (
            <div className="row g-3 mt-2 pt-3 border-top">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 font-sans fw-semibold">
                      <i className="ti ti-user-plus me-1"></i>CREATED BY
                    </span>
                    <span className="font-mono text-secondary small">
                      <i className="ti ti-calendar me-1"></i>
                      {formatDateTime(record.work_created_at || workForm?.created_at || record.created_at)}
                    </span>
                  </div>
                  <div className="fw-bold text-dark mt-2 fs-6">
                    {record.work_created_by || workForm?.created_by || 'AdminIT (EMP001)'}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 font-sans fw-semibold">
                      <i className="ti ti-refresh me-1"></i>LAST UPDATED BY
                    </span>
                    <span className="font-mono text-secondary small">
                      <i className="ti ti-clock me-1"></i>
                      {formatDateTime(record.work_updated_at || workForm?.updated_at || workForm?.created_at || record.created_at)}
                    </span>
                  </div>
                  <div className="fw-bold text-dark mt-2 fs-6">
                    {record.work_updated_by || workForm?.updated_by || workForm?.created_by || 'AdminIT (EMP001)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Stage-Specific Details Section */}
      {isMeterPrintRecord ? (
        <>
          {/* Optical DLMS Meter Read & Laser Print Details Card */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <i className="ti ti-scan fs-4 text-success"></i>
                <h5 className="mb-0 fw-bold text-dark">Meter Optical DLMS & Laser Print Telemetry</h5>
              </div>
              <span className="badge bg-success-subtle text-success border border-success px-2.5 py-1 font-mono">
                Record #{record.id}
              </span>
            </div>
            <div className="card-body p-4">
              <div className="row g-4">
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-3 rounded-3 border bg-light-subtle h-100">
                    <span className="text-muted small d-block mb-1">Meter Serial Number (S/N)</span>
                    <strong className="text-primary font-mono fs-5 d-block">{record.meter_serial_no || '-'}</strong>
                    <small className="text-muted font-mono">
                      OBIS: {record.raw_dlms_data?.meter_serial_obis || '0.0.96.1.0.255'}
                    </small>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-3 rounded-3 border bg-light-subtle h-100">
                    <span className="text-muted small d-block mb-1">Modem IMEI Number</span>
                    <strong className="text-success font-mono fs-5 d-block">{record.imei_no || '-'}</strong>
                    <small className="text-muted font-mono">
                      OBIS: {record.raw_dlms_data?.imei_obis || '0.0.155.1.2.255'}
                    </small>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-3 rounded-3 border bg-light-subtle h-100">
                    <span className="text-muted small d-block mb-1">NIC Card Serial Number</span>
                    <strong className="text-dark font-mono fs-5 d-block">
                      {record.nic_sr_no && record.nic_sr_no !== `NIC-${record.meter_serial_no}` ? record.nic_sr_no : '-'}
                    </strong>
                    <small className="text-muted font-mono">
                      OBIS: {record.raw_dlms_data?.nic_sr_obis || '0.0.155.1.1.255'}
                    </small>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <span className="text-muted small d-block mb-1">Laser Print Status</span>
                  {isPrinted ? (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 font-mono fs-6">
                      <i className="ti ti-printer me-1"></i>
                      {record.print}
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5 font-mono">
                      NULL (Pending Print)
                    </span>
                  )}
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <span className="text-muted small d-block mb-1">Laser Printed At (printAt)</span>
                  <strong className="text-dark font-mono">
                    {printAtVal ? formatDateTime(printAtVal) : '-'}
                  </strong>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <span className="text-muted small d-block mb-1">Optical Probe Interface</span>
                  <strong className="text-dark font-mono">
                    {record.raw_dlms_data?.port || 'COM3'} ({record.raw_dlms_data?.baudRate || 9600} Baud)
                  </strong>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <span className="text-muted small d-block mb-1">DLMS Read Timestamp</span>
                  <strong className="text-secondary font-mono small">
                    {formatDateTime(record.raw_dlms_data?.captured_time || record.created_at)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 8-Channel JIG Telemetry Output Grid for Stage 4 / JIG Records */
        <div className="card shadow-sm border mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="ti ti-layout-grid fs-4 text-primary"></i>
              <h5 className="mb-0 fw-bold text-dark">
                8-Channel Hardware Telemetry Output ({record.cycle_uuid || `ZMRJIG${String(record.cycle_id || 1).padStart(4, '0')}`})
              </h5>
            </div>
            <span className="badge bg-success-subtle text-success border border-success px-2.5 py-1.5 fw-semibold">
              <i className="ti ti-check me-1"></i>
              {record.passed_channels !== undefined
                ? record.passed_channels
                : (record.channels || []).filter(c => c.status === 'PASS').length}{' '}
              / {record.total_channels || 8} Channels Passed
            </span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(chNo => {
                const chList = record.channels || [];
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
                      className={`border rounded-3 p-3 h-100 bg-white shadow-2xs ${
                        isPass ? 'border-success border-2 shadow-sm' : isDup ? 'border-warning border-2' : ''
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                        <span className="fw-bold small text-dark d-flex align-items-center gap-1.5">
                          <i className="ti ti-box text-warning fs-6"></i>
                          <span>Channel {chNo}</span>
                        </span>
                        <span
                          className={`badge ${
                            isPass ? 'bg-success text-white' : isDup ? 'bg-warning text-dark' : 'bg-secondary text-white'
                          } px-2.5 py-1 font-mono text-uppercase`}
                          style={{ fontSize: '11px' }}
                        >
                          {isPass ? '✓ PASS' : isDup ? 'DUPLICATE' : 'NCON'}
                        </span>
                      </div>

                      <div className="font-mono space-y-1" style={{ fontSize: '12px', lineHeight: '1.7' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">nic_uuid:</span>
                          <span className={`fw-bold font-mono ${nicUuid && nicUuid !== '-' ? 'text-primary' : 'text-muted'}`}>
                            {nicUuid}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">imei:</span>
                          <span className={`fw-semibold font-mono ${isDup ? 'text-warning text-dark' : 'text-dark'}`}>
                            {imeiVal}
                          </span>
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

