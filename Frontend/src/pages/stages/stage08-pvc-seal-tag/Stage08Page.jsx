import React, { useState, useEffect, useRef, useMemo } from 'react';
import { stageManagementService } from '../../../services/apiServices';
import { stage08Service } from '../../../services/stages/stage08.service';
import { showSuccessAlert, showErrorAlert } from '../../../utils/swal';

export const STAGE_08_FIELDS = [
  { key: 'hologramSeal1', label: 'Hologram Seal 1', shortLabel: 'Hologram 1', placeholder: 'Scan or enter Hologram Seal 1 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal2', label: 'Hologram Seal 2', shortLabel: 'Hologram 2', placeholder: 'Scan or enter Hologram Seal 2 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal3', label: 'Hologram Seal 3', shortLabel: 'Hologram 3', placeholder: 'Scan or enter Hologram Seal 3 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal4', label: 'Hologram Seal 4', shortLabel: 'Hologram 4', placeholder: 'Scan or enter Hologram Seal 4 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal5', label: 'Hologram Seal 5', shortLabel: 'Hologram 5', placeholder: 'Scan or enter Hologram Seal 5 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal6', label: 'Hologram Seal 6', shortLabel: 'Hologram 6', placeholder: 'Scan or enter Hologram Seal 6 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal7', label: 'Hologram Seal 7', shortLabel: 'Hologram 7', placeholder: 'Scan or enter Hologram Seal 7 barcode...', icon: 'ti-shield-check' },
  { key: 'hologramSeal8', label: 'Hologram Seal 8', shortLabel: 'Hologram 8', placeholder: 'Scan or enter Hologram Seal 8 barcode...', icon: 'ti-shield-check' },
  { key: 'meterLeftSeal1', label: 'Meter Left Seal 1', shortLabel: 'Left Seal 1', placeholder: 'Scan or enter Meter Left Seal 1 barcode...', icon: 'ti-tag' },
  { key: 'meterLeftSeal2', label: 'Meter Left Seal 2', shortLabel: 'Left Seal 2', placeholder: 'Scan or enter Meter Left Seal 2 barcode...', icon: 'ti-tag' },
  { key: 'meterRightSeal1', label: 'Meter Right Seal 1', shortLabel: 'Right Seal 1', placeholder: 'Scan or enter Meter Right Seal 1 barcode...', icon: 'ti-tag' },
  { key: 'meterRightSeal2', label: 'Meter Right Seal 2', shortLabel: 'Right Seal 2', placeholder: 'Scan or enter Meter Right Seal 2 barcode...', icon: 'ti-tag' },
  { key: 'modemSeal', label: 'Modem Seal', shortLabel: 'Modem Seal', placeholder: 'Scan or enter Modem Seal barcode...', icon: 'ti-wifi' },
  { key: 'looseSeal1', label: 'Loose Seal 1', shortLabel: 'Loose Seal 1', placeholder: 'Scan or enter Loose Seal 1 barcode...', icon: 'ti-barcode' },
  { key: 'looseSeal2', label: 'Loose Seal 2', shortLabel: 'Loose Seal 2', placeholder: 'Scan or enter Loose Seal 2 barcode...', icon: 'ti-barcode' },
  { key: 'looseSeal3', label: 'Loose Seal 3', shortLabel: 'Loose Seal 3', placeholder: 'Scan or enter Loose Seal 3 barcode...', icon: 'ti-barcode' },
  { key: 'nicSerialNumber', label: 'NIC SN', shortLabel: 'NIC SN', placeholder: 'Scan or enter NIC SN barcode...', icon: 'ti-cpu' }
];

export default function Stage08Page() {
  const [activeWorkForm, setActiveWorkForm] = useState(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

  // Meter identifier & dynamic seal input values
  const [meterSerial, setMeterSerial] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verified records history
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const inputRefs = useRef({});

  // 1. Load active assigned work form for Stage 8
  const loadActiveWorkForm = async () => {
    try {
      const res = await stageManagementService.getForms({ stage_number: 8 });
      const forms = Array.isArray(res) ? res : (res?.forms || res?.data || []);

      if (forms && forms.length > 0) {
        // Find assigned active work form
        const assigned = forms.find(f =>
          Boolean(f.assigned_operator_id) &&
          f.status !== 'DE-ACTIVE' &&
          f.status !== 'COMPLETED'
        ) || forms[0];

        setActiveWorkForm(assigned || null);
        if (assigned) {
          setCompletedCount(assigned.completed_quantity || 0);
        }
      } else {
        setActiveWorkForm(null);
      }
    } catch (err) {
      console.warn('[Stage08] Error loading work forms:', err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // 2. Load verified records for Stage 8
  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await stage08Service.getRecords({ limit: 50 });
      const list = Array.isArray(res) ? res : (res?.records || res?.data || []);
      setRecords(list);
    } catch (err) {
      console.warn('[Stage08] Error loading records:', err.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadActiveWorkForm();
    fetchRecords();
    const interval = setInterval(loadActiveWorkForm, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter active fields configured for this work order
  const activeFields = useMemo(() => {
    if (!activeWorkForm) return [];
    const statuses = activeWorkForm.print_config?.stage08FieldStatuses || {};
    return STAGE_08_FIELDS.filter(f => Boolean(statuses[f.key]));
  }, [activeWorkForm]);

  // Handle changing input for a specific field
  const handleFieldValueChange = (key, value) => {
    setFieldValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Move to next field on Enter key
  const handleKeyDown = (e, currentKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentKey === 'meterSerial') {
        if (activeFields.length > 0 && inputRefs.current[activeFields[0].key]) {
          inputRefs.current[activeFields[0].key].focus();
        }
      } else {
        const currentIndex = activeFields.findIndex(f => f.key === currentKey);
        if (currentIndex >= 0 && currentIndex < activeFields.length - 1) {
          const nextKey = activeFields[currentIndex + 1].key;
          if (inputRefs.current[nextKey]) {
            inputRefs.current[nextKey].focus();
          }
        } else if (isAllScanned) {
          handleSubmit();
        }
      }
    }
  };

  // Check if meter serial and all active fields have values
  const isMeterSerialFilled = Boolean(meterSerial && meterSerial.trim().length >= 4);
  const isAllScanned = Boolean(
    isMeterSerialFilled &&
    (activeFields.length === 0 || activeFields.every(f => fieldValues[f.key] && String(fieldValues[f.key]).trim().length > 0))
  );

  // Clear all form inputs
  const handleClear = () => {
    setMeterSerial('');
    setFieldValues({});
    if (inputRefs.current.meterSerial) {
      inputRefs.current.meterSerial.focus();
    }
  };

  // Submit verified seals record
  const handleSubmit = async () => {
    if (!isAllScanned || isSubmitting) return;

    if (!activeWorkForm) {
      showErrorAlert('No Active Work Order', 'Please assign an active Work Order to Stage 8 before verifying seals.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        meter_no: meterSerial.trim(),
        meter_serial: meterSerial.trim(),
        form_id: activeWorkForm.form_id || activeWorkForm.id,
        work_id: activeWorkForm.form_id,
        status: 'PASS',
        seals: {
          meter_serial: meterSerial.trim(),
          ...fieldValues
        }
      };

      const res = await stage08Service.submitSeal(payload);
      if (res && res.success) {
        showSuccessAlert(
          'Seal Verified & Saved',
          `Meter ${meterSerial.trim()} paired with all ${activeFields.length} security seals successfully!`
        );

        if (typeof res.completed_quantity === 'number') {
          setCompletedCount(res.completed_quantity);
        } else {
          setCompletedCount(prev => prev + 1);
        }

        // Reset inputs for next meter
        setMeterSerial('');
        setFieldValues({});
        if (inputRefs.current.meterSerial) {
          inputRefs.current.meterSerial.focus();
        }

        fetchRecords();
      } else {
        showErrorAlert('Submission Failed', res?.message || 'Failed to submit seal verification.');
      }
    } catch (err) {
      showErrorAlert('Error', err.message || 'Error submitting seal verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export records to CSV
  const handleExportCsv = () => {
    if (!records || records.length === 0) {
      showErrorAlert('No Records', 'There are no verified records to export.');
      return;
    }

    let csv = '\uFEFF# ID,Meter Serial,Seals Data,Status,Timestamp\n';
    records.forEach((r, idx) => {
      const sealDetails = typeof r.seals === 'object' && r.seals ? JSON.stringify(r.seals).replace(/"/g, '""') : (r.seal_barcode || '');
      csv += `"${r.id || idx + 1}","${r.meter_serial || r.meter_no || ''}","${sealDetails}","${r.status || 'VERIFIED'}","${r.time || r.created_at || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stage08_PVC_Seal_Report_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="container-fluid px-0 pb-4">
      {/* 1. Active Work Order Ribbon Banner (Exact Image 2 Style) */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-body py-2.5 px-3.5">
          {!activeWorkForm || !activeWorkForm.assigned_operator_id ? (
            <div className="text-secondary small fst-italic d-flex align-items-center gap-1.5 py-1">
              <i className="ti ti-info-circle text-warning fs-5"></i>
              <span>No Work ID currently assigned to Stage #8. Assign a Work ID in Stage Management to start production.</span>
            </div>
          ) : (
            <div className="small font-mono text-secondary d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <span className="d-inline-flex align-items-center gap-1.5">
                  <i className="ti ti-id-badge text-primary fs-5"></i>
                  <strong className="text-dark">ACTIVE WORK ID:</strong>{' '}
                  <span className="text-primary fw-bold">{activeWorkForm.form_id}</span>
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Batch:</strong> <span className="text-dark fw-bold">{activeWorkForm.batch_no}</span>
                </span>
                {activeWorkForm.month_year && (
                  <>
                    <span>&bull;</span>
                    <span>
                      <strong>Date:</strong> <span className="text-dark fw-bold">{activeWorkForm.month_year}</span>
                    </span>
                  </>
                )}
                <span>&bull;</span>
                <span>
                  <strong>Target:</strong> <span className="text-dark fw-bold">{activeWorkForm.target_quantity || 0}</span>
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Completed:</strong> <span className="text-success fw-bold">{completedCount}</span>
                </span>
                <span>&bull;</span>
                <span className={`badge px-2.5 py-1 ${activeWorkForm.status === 'IN_PROGRESS' ? 'bg-success text-white' : 'bg-primary text-white'}`}>
                  {activeWorkForm.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Work Order Security Seal Input Fields */}
      <div className="card shadow-2xs border-0 mb-4 bg-white">
        <div className="card-header bg-white py-3 px-3.5 border-bottom border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-tags text-primary fs-4"></i>
            <h6 className="mb-0 fw-bold text-dark">
              Active Security Seal Fields ({activeFields.length} Configured)
            </h6>
          </div>
          <span className="small text-muted font-mono">
            Work ID: {activeWorkForm?.form_id || 'N/A'}
          </span>
        </div>
        <div className="card-body p-3.5">
          {activeFields.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="ti ti-alert-triangle fs-2 text-warning d-block mb-2"></i>
              <p className="mb-1 fw-semibold text-dark">No Active Input Fields Configured</p>
              <small className="text-secondary">
                This work order currently has no security seal fields enabled. Configure active seal fields under Stage Management &gt; Edit Work Order.
              </small>
            </div>
          ) : (
            <div className="row g-3">
              {activeFields.map((field) => {
                const val = fieldValues[field.key] || '';
                const isFilled = Boolean(val && val.trim().length > 0);

                return (
                  <div className="col-12 col-md-6" key={field.key}>
                    <div className={`p-3 rounded-3 border h-100 ${isFilled ? 'border-success-subtle bg-success-subtle/10' : 'border-secondary-subtle bg-white'}`}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-semibold text-dark small d-flex align-items-center gap-1.5">
                          <i className={`ti ${field.icon || 'ti-tag'} text-primary`}></i>
                          {field.label}
                        </span>
                        <div>
                          {isFilled ? (
                            <span className="badge bg-success text-white px-2 py-0.5 font-mono text-2xs">
                              <i className="ti ti-check me-0.5"></i> SCANNED
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-0.5 font-mono text-2xs">
                              AWAITING SCAN
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light border-secondary-subtle">
                          <i className="ti ti-scan text-muted"></i>
                        </span>
                        <input
                          type="text"
                          ref={(el) => (inputRefs.current[field.key] = el)}
                          className="form-control font-mono fw-medium"
                          placeholder={field.placeholder}
                          value={val}
                          onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, field.key)}
                        />
                        {val && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleFieldValueChange(field.key, '')}
                            title="Clear"
                          >
                            <i className="ti ti-x"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          {activeFields.length > 0 && (
            <div className="mt-4 pt-3 border-top border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small text-muted font-mono">
                {activeFields.filter(f => fieldValues[f.key] && fieldValues[f.key].trim().length > 0).length} of {activeFields.length} seals scanned
              </span>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-light border btn-sm fw-semibold"
                  onClick={handleClear}
                >
                  <i className="ti ti-trash me-1"></i> Reset Fields
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-4 fw-bold shadow-xs ${isAllScanned && !isSubmitting ? 'btn-success text-white' : 'btn-secondary text-white'}`}
                  onClick={handleSubmit}
                  disabled={!isAllScanned || isSubmitting}
                >
                  <i className={`ti ${isSubmitting ? 'ti-loader spin' : 'ti-circle-check'} me-1`}></i>
                  {isSubmitting ? 'Verifying & Saving...' : 'Verify & Submit Seals'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
