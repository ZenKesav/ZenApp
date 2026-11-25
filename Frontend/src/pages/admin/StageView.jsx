import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../app/store';
import { stageManagementService } from '../../services/apiServices';
import { userService } from '../../services/admin/userService';
import { Modal, LoadingSpinner, SkeletonTable, Pagination } from '../../components/CommonComponents';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/swal';
import { getUserAssignedStages } from '../../utils/stageUtils';
import MeterBodyPrintConsole from '../stages/stage09-meter-box-print/MeterBodyPrintConsole';
import MeterInteractiveTextEditor from '../../components/stages/stage09-meter-box-print/MeterBodyPrint/MeterInteractiveTextEditor';

const STAGE_08_FIELDS = [
  { key: 'hologramSeal1', label: 'Hologram Seal 1' },
  { key: 'hologramSeal2', label: 'Hologram Seal 2' },
  { key: 'hologramSeal3', label: 'Hologram Seal 3' },
  { key: 'hologramSeal4', label: 'Hologram Seal 4' },
  { key: 'hologramSeal5', label: 'Hologram Seal 5' },
  { key: 'hologramSeal6', label: 'Hologram Seal 6' },
  { key: 'hologramSeal7', label: 'Hologram Seal 7' },
  { key: 'hologramSeal8', label: 'Hologram Seal 8' },
  { key: 'meterLeftSeal1', label: 'Meter Left Seal 1' },
  { key: 'meterLeftSeal2', label: 'Meter Left Seal 2' },
  { key: 'meterRightSeal1', label: 'Meter Right Seal 1' },
  { key: 'meterRightSeal2', label: 'Meter Right Seal 2' },
  { key: 'modemSeal', label: 'Modem Seal' },
  { key: 'looseSeal1', label: 'Loose Seal 1' },
  { key: 'looseSeal2', label: 'Loose Seal 2' },
  { key: 'looseSeal3', label: 'Loose Seal 3' },
  { key: 'nicSerialNumber', label: 'NIC SN' }
];

const createDefaultStage08FieldStatuses = () =>
  STAGE_08_FIELDS.reduce((statuses, { key }) => {
    statuses[key] = true;
    return statuses;
  }, {});

function Stage08FieldToggles({ statuses, onChange }) {
  return (
    <div className="mb-3">
      <h6 className="form-label fw-semibold text-dark">PVC Seal Fields</h6>
      <div className="row g-2">
        {STAGE_08_FIELDS.map(({ key, label }) => (
          <div className="col-md-6" key={key}>
            <div className="d-flex align-items-center justify-content-between gap-3 border rounded-2 px-3 py-2">
              <span className="small fw-medium text-dark">{label}</span>
              <div className="form-check form-switch d-flex align-items-center gap-2 mb-0">
                <span className={`small ${statuses[key] ? 'text-success' : 'text-muted'}`}>
                  {statuses[key] ? 'Active' : 'Inactive'}
                </span>
                <input
                  type="checkbox"
                  className="form-check-input m-0"
                  role="switch"
                  aria-label={`${label} active`}
                  checked={Boolean(statuses[key])}
                  onChange={(event) => onChange(key, event.target.checked)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StageView() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const rawRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const isSupervisor = rawRole === 'SUPERVISOR' || rawRole.includes('SUPERVISOR');
  const isAdmin = rawRole === 'ADMIN' || rawRole.includes('ADMIN') || rawRole.includes('IT');
  const userRoleLabel = isSupervisor ? 'Supervisor' : (isAdmin ? 'Admin(IT)' : 'Admin');
  const currentUserEmail = user?.email || user?.employee_id || 'admin@zenmeter.com';
  const currentUserName = user?.name ? `${user.name} (${user.employee_id || userRoleLabel})` : (user?.user_name || `${userRoleLabel} (EMP001)`);

  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(null);
  const [stages, setStages] = useState([]);

  // Stage Work Forms (Work IDs)
  const [stageForms, setStageForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [operatorsList, setOperatorsList] = useState([]);
  const [formsPage, setFormsPage] = useState(1);
  const [formsPageSize, setFormsPageSize] = useState(10);

  // Work Order Active Mode: null | 'create' | 'edit' | 'view'
  const [workOrderMode, setWorkOrderMode] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);
  const workOrderSectionRef = useRef(null);

  // Create Work Form state
  const [newFormId, setNewFormId] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newMonthYear, setNewMonthYear] = useState('');
  const [newTargetQty, setNewTargetQty] = useState(500);
  const [newDescription, setNewDescription] = useState('');
  const [newStage08FieldStatuses, setNewStage08FieldStatuses] = useState(createDefaultStage08FieldStatuses);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // New Work Order Interactive Elements
  const [newVariableTexts, setNewVariableTexts] = useState([]);
  const [newLogos, setNewLogos] = useState([]);
  const [newQrCodes, setNewQrCodes] = useState([]);
  const [newActualPrintImage, setNewActualPrintImage] = useState(null);
  const [newActualPrintImageName, setNewActualPrintImageName] = useState('');

  // Edit Work Form state
  const [editingForm, setEditingForm] = useState(null);
  const [editFormId, setEditFormId] = useState('');
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editMonthYear, setEditMonthYear] = useState('');
  const [editTargetQty, setEditTargetQty] = useState(100);
  const [editFormDescription, setEditFormDescription] = useState('');
  const [editStage08FieldStatuses, setEditStage08FieldStatuses] = useState(createDefaultStage08FieldStatuses);
  const [editVariableTexts, setEditVariableTexts] = useState([]);
  const [editLogos, setEditLogos] = useState([]);
  const [editQrCodes, setEditQrCodes] = useState([]);
  const [editActualPrintImage, setEditActualPrintImage] = useState(null);
  const [editActualPrintImageName, setEditActualPrintImageName] = useState('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Laser Preview Modal
  const [isLaserPreviewOpen, setIsLaserPreviewOpen] = useState(false);

  // Date formatting helper: dd/mm/yyyy hh:mm AM/PM
  const formatDateTimeDDMMYYYY = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const normalizedStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) return String(dateStr);

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');

      return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
    } catch (e) {
      return String(dateStr);
    }
  };

  useEffect(() => {
    loadStageAndForms();
    loadOperators();
  }, [stageId]);

  const loadStageAndForms = async () => {
    setLoading(true);
    try {
      const res = await stageManagementService.getStages();
      const allStages = Array.isArray(res) ? res : (res?.data || res?.stages || []);
      setStages(allStages);

      const found =
        allStages.find((s) => Number(s.stage_number) === Number(stageId)) ||
        allStages.find((s) => String(s.id) === String(stageId));

      if (!found) {
        showErrorAlert('Stage Not Found', `Could not find stage with ID or Number '${stageId}'.`);
        navigate('/stage-management');
        return;
      }

      setStage(found);
      await loadFormsForStage(found.stage_number);
    } catch (err) {
      console.error('Failed to load stage:', err);
      showErrorAlert('Error', err.message || 'Failed to load stage information.');
    } finally {
      setLoading(false);
    }
  };

  const loadFormsForStage = async (sNum) => {
    setFormsLoading(true);
    try {
      const res = await stageManagementService.getForms({ stage_number: sNum });
      const forms = Array.isArray(res) ? res : (res?.data || res?.forms || []);
      setStageForms(forms);
    } catch (err) {
      console.error('Failed to load stage forms:', err);
      setStageForms([]);
    } finally {
      setFormsLoading(false);
    }
  };

  const loadOperators = () => {
    userService.getUsers().then((res) => {
      const users = Array.isArray(res) ? res : (res?.data || res?.users || []);
      const ops = users.filter((u) => {
        const r = (u.role || '').toUpperCase();
        return r === 'OPERATOR' || (r.includes('OPERATOR') && !r.includes('SUPERVISOR') && !r.includes('ADMIN'));
      });
      setOperatorsList(ops);
    }).catch((err) => console.error('Error fetching operators:', err));
  };

  const isOperatorForStage = (op, sNum) => {
    if (!op || !sNum) return false;
    if (Number(op.stage_id) === Number(sNum)) return true;
    if (op.assigned_stage) {
      const raw = String(op.assigned_stage).toLowerCase();
      if (
        raw.includes(`${sNum} stage`) ||
        raw.includes(`stage ${sNum}`) ||
        raw.includes(`stage-${sNum}`) ||
        raw.split(',').some((p) => p.trim() === String(sNum))
      ) {
        return true;
      }
    }
    if (Array.isArray(op.stageDetailsList) && op.stageDetailsList.length > 0) {
      if (op.stageDetailsList.some((s) => Number(s.stage_number || s.id) === Number(sNum))) {
        return true;
      }
    }
    try {
      const userStages = getUserAssignedStages(op);
      if (userStages && userStages.some((s) => Number(s.id) === Number(sNum))) return true;
    } catch (e) {}
    return false;
  };

  const isStage4 = Boolean(stage && Number(stage.stage_number) === 4);
  const isStage8 = Boolean(stage && Number(stage.stage_number) === 8);
  const isStage9 = Boolean(stage && Number(stage.stage_number) === 9);
  const isBodyPrintStage =
    stage &&
    ((stage.stage_name && (stage.stage_name.toLowerCase().includes('body print') || stage.stage_name.toLowerCase().includes('inside print'))) ||
      Number(stage.stage_number) === 4 ||
      Number(stage.stage_number) === 7 ||
      Number(stage.stage_number) === 9);

  // Open Create Work Order Modal
  const handleOpenCreateForm = () => {
    if (!stage) return;
    const sNum = stage.stage_number;

    // Calculate next sequence without duplicate collisions
    let maxSeq = 0;
    stageForms.forEach((f) => {
      const match = (f.form_id || '').match(new RegExp(`WORK-STG${sNum}-(\\d+)`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    if (maxSeq === 0) maxSeq = stageForms.length;
    let nextSeq = maxSeq + 1;
    let candidateId = `WORK-STG${sNum}-${String(nextSeq).padStart(3, '0')}`;
    while (stageForms.some((f) => (f.form_id || '').trim().toLowerCase() === candidateId.toLowerCase())) {
      nextSeq++;
      candidateId = `WORK-STG${sNum}-${String(nextSeq).padStart(3, '0')}`;
    }

    const batchSeq = String(nextSeq).padStart(2, '0');
    setNewFormId(candidateId);
    setNewFormTitle(`${stage.stage_name} Work Order`);
    setNewBatchNo(`BATCH-2026-${batchSeq}`);
    setNewMonthYear('');
    setNewTargetQty(500);
    setNewDescription(stage.description || 'Front full print');
    setNewStage08FieldStatuses(createDefaultStage08FieldStatuses());
    setNewVariableTexts([
      {
        id: 'vt-1',
        text: (stage.stage_name || 'ZENMETER SMART METER').toUpperCase(),
        x: 135,
        y: 18,
        leftPercent: 32.0,
        topPercent: 4.2,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff'
      }
    ]);
    setNewLogos([
      {
        id: 'logo-1',
        url: null,
        name: 'ZenMeter Logo',
        width: 95,
        leftPercent: 6.5,
        topPercent: 4.0
      }
    ]);
    setNewQrCodes([
      {
        id: 'qr-1',
        value: `${candidateId}|BATCH-2026-${batchSeq}|TYPE:Z1A02FP3`,
        size: 56,
        color: '#ffffff',
        bgColor: 'transparent',
        leftPercent: 72,
        topPercent: 12.8
      }
    ]);
    setNewActualPrintImage(null);
    setNewActualPrintImageName('');
    setWorkOrderMode('create');
    setTimeout(() => {
      workOrderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Open View Work Order on page
  const handleOpenViewForm = (form) => {
    setViewingForm(form);
    setWorkOrderMode('view');
    setTimeout(() => {
      workOrderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!stage) return;

    const trimmedFormId = newFormId.trim();
    if (!trimmedFormId) {
      showErrorAlert('Validation Error', 'Work ID / Form ID is required.');
      return;
    }

    // Client-side Duplicate Check
    const isDuplicate = stageForms.some(
      (f) => (f.form_id || '').trim().toLowerCase() === trimmedFormId.toLowerCase()
    );
    if (isDuplicate) {
      showErrorAlert(
        'Duplicate Work ID',
        `Work ID / Form ID '${trimmedFormId}' already exists in this stage. Please enter a unique Work ID.`
      );
      return;
    }

    if (isStage4 && !newActualPrintImage) {
      showErrorAlert(
        'Validation Error',
        'Actual Print layout image/PDF is required for Stage #4. Please upload an Actual Print file before creating.'
      );
      return;
    }

    setFormSubmitting(true);
    try {
      const printConfigPayload = isBodyPrintStage
        ? {
            variableTexts: newVariableTexts,
            logos: newLogos,
            qrCodes: newQrCodes,
            actualPrintImageUrl: newActualPrintImage || null,
            actualPrintImageName: newActualPrintImageName || '',
            customLogoUrl: newLogos[0]?.url || null,
            logoType: newLogos[0]?.url ? 'custom' : 'zenmeter',
            logoPos: newLogos[0] ? { leftPercent: newLogos[0].leftPercent, topPercent: newLogos[0].topPercent } : null,
            logoWidth: newLogos[0]?.width || 110,
            qrValue: newQrCodes[0]?.value || '',
            qrPos: newQrCodes[0] ? { leftPercent: newQrCodes[0].leftPercent, topPercent: newQrCodes[0].topPercent } : null,
            qrSize: newQrCodes[0]?.size || 60,
            brandTitle: 'ZenSmart®',
            serialNo: `ZG0000${String((stageForms.length + 1) * 100 + 5).padStart(3, '0')}`,
            imei: `86593108739${String(Date.now()).slice(-4)}`,
            wanComm: 'WAN Comm. Cellular: 850/900/1800/2100/2300/2500 MHz',
            meterTitle: '1Phase 2 Wire ac Static kWh Smart Meter',
            voltageCurrent: '240V, 10-60A, 50Hz',
            accuracyClass: 'Class-1, 27°C',
            category: 'Cat-D1, W.P.',
            meterType: 'Z1A02FP3',
            propertyOf: `' ${newVariableTexts[0]?.text || 'Sample Meter'} '`,
            loaNo: 'LOA-2026/089',
            pulseConstant: '3200 imp/kWh',
            mfgDate: isStage4 || isStage8 ? '' : (newMonthYear.trim() || ''),
            manufacturer: 'Zenmeter Solutions Pvt Ltd., Bangalore, India',
            bisText: 'For details of BIS certification please visit www.bis.gov.in'
          }
        : null;
      const finalPrintConfigPayload = isStage8
        ? { ...(printConfigPayload || {}), stage08FieldStatuses: newStage08FieldStatuses }
        : printConfigPayload;

      const res = await stageManagementService.createForm({
        form_id: trimmedFormId,
        stage_number: stage.stage_number,
        stage_name: stage.stage_name,
        form_title: newFormTitle.trim(),
        batch_no: newBatchNo.trim(),
        month_year: isStage4 || isStage8 ? '' : (newMonthYear.trim() || ''),
        target_quantity: Number(newTargetQty) || 100,
        description: newDescription.trim(),
        print_config: finalPrintConfigPayload,
        assigned_operator_id: null,
        assigned_operator_name: null,
        status: 'ACTIVE',
        created_by: currentUserName,
        updated_by: currentUserName
      });

      showSuccessAlert(
        'Work ID Created',
        res.message || `Work ID '${trimmedFormId}' successfully created for Stage #${stage.stage_number}!`
      );
      setWorkOrderMode(null);
      loadFormsForStage(stage.stage_number);
    } catch (err) {
      showErrorAlert('Create Form Failed', err.message || 'Failed to create work form.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Work Order Modal
  const handleOpenEditForm = (form) => {
    setEditingForm(form);
    setEditFormId(form.form_id || '');
    setEditFormTitle(form.form_title || '');
    setEditBatchNo(form.batch_no || 'BATCH-2026-01');
    setEditMonthYear(form.month_year || form.print_config?.mfgDate || '');
    setEditTargetQty(form.target_quantity || 100);
    setEditFormDescription(form.description || '');
    setEditStage08FieldStatuses({
      ...createDefaultStage08FieldStatuses(),
      ...(form.print_config?.stage08FieldStatuses || {})
    });

    const existingVTs = form.print_config?.variableTexts;
    if (Array.isArray(existingVTs) && existingVTs.length > 0) {
      setEditVariableTexts(existingVTs);
    } else {
      setEditVariableTexts([
        {
          id: 'vt-1',
          text: (form.form_title || 'ZENMETER SMART METER').toUpperCase(),
          x: 135,
          y: 18,
          leftPercent: 32.0,
          topPercent: 4.2,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#ffffff'
        }
      ]);
    }

    const existingLogos = form.print_config?.logos;
    if (Array.isArray(existingLogos) && existingLogos.length > 0) {
      setEditLogos(existingLogos);
    } else {
      setEditLogos([
        {
          id: 'logo-1',
          url: form.print_config?.customLogoUrl || null,
          name: 'ZenMeter Logo',
          width: form.print_config?.logoWidth || 95,
          leftPercent: form.print_config?.logoPos?.leftPercent ?? 6.5,
          topPercent: form.print_config?.logoPos?.topPercent ?? 4.0
        }
      ]);
    }

    const existingQrs = form.print_config?.qrCodes;
    if (Array.isArray(existingQrs) && existingQrs.length > 0) {
      setEditQrCodes(existingQrs);
    } else {
      setEditQrCodes([
        {
          id: 'qr-1',
          value: form.print_config?.qrValue || `${form.form_id}|BATCH:${form.batch_no || 'BATCH-2026-01'}`,
          size: form.print_config?.qrSize || 56,
          color: '#ffffff',
          bgColor: 'transparent',
          leftPercent: form.print_config?.qrPos?.leftPercent ?? 72,
          topPercent: form.print_config?.qrPos?.topPercent ?? 12.8
        }
      ]);
    }

    setEditActualPrintImage(form.print_config?.actualPrintImageUrl || null);
    setEditActualPrintImageName(form.print_config?.actualPrintImageName || '');

    setWorkOrderMode('edit');
    setTimeout(() => {
      workOrderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditForm = async (e) => {
    e.preventDefault();
    if (!editingForm) return;

    if (isStage4 && !editActualPrintImage) {
      showErrorAlert(
        'Validation Error',
        'Actual Print layout image/PDF is required for Stage #4. Please upload an Actual Print file before saving.'
      );
      return;
    }

    setEditFormSubmitting(true);
    try {
      const { actualPrintSourceUrl: staleSourceUrl, actualPrintFileType: staleFileType, ...restEditPrintConfig } = editingForm.print_config || {};
      const actualPrintChanged = (editActualPrintImage || null) !== (editingForm.print_config?.actualPrintImageUrl || null);
      const updatedPrintConfig = isBodyPrintStage
        ? {
            ...restEditPrintConfig,
            ...(actualPrintChanged
              ? {
                  actualPrintSourceUrl: editActualPrintImage && /_preview\.(png|jpe?g)$/i.test(editActualPrintImage)
                    ? editActualPrintImage.replace(/_preview\.(png|jpe?g)$/i, '.pdf')
                    : (editActualPrintImage || null),
                  actualPrintFileType: editActualPrintImage && /_preview\.(png|jpe?g)$/i.test(editActualPrintImage)
                    ? 'application/pdf'
                    : staleFileType || null
                }
              : {
                  actualPrintSourceUrl: staleSourceUrl || null,
                  actualPrintFileType: staleFileType || null
                }),
            variableTexts: editVariableTexts,
            logos: editLogos,
            qrCodes: editQrCodes,
            actualPrintImageUrl: editActualPrintImage || null,
            actualPrintImageName: editActualPrintImageName || '',
            customLogoUrl: editLogos[0]?.url || null,
            logoType: editLogos[0]?.url ? 'custom' : 'zenmeter',
            logoPos: editLogos[0] ? { leftPercent: editLogos[0].leftPercent, topPercent: editLogos[0].topPercent } : null,
            logoWidth: editLogos[0]?.width || 110,
            qrValue: editQrCodes[0]?.value || '',
            qrPos: editQrCodes[0] ? { leftPercent: editQrCodes[0].leftPercent, topPercent: editQrCodes[0].topPercent } : null,
            customLogoText: editVariableTexts[0]?.text || '',
            mfgDate: isStage4 || isStage8 ? '' : (editMonthYear.trim() || '')
          }
        : editingForm.print_config;
      const finalPrintConfig = isStage8
        ? { ...(updatedPrintConfig || {}), mfgDate: '', stage08FieldStatuses: editStage08FieldStatuses }
        : updatedPrintConfig;

      const targetId = editingForm.id || editingForm.form_id;
      const res = await stageManagementService.updateForm(targetId, {
        form_title: editFormTitle.trim(),
        batch_no: editBatchNo.trim(),
        month_year: isStage4 || isStage8 ? '' : (editMonthYear.trim() || ''),
        target_quantity: Number(editTargetQty) || 100,
        description: editFormDescription.trim(),
        print_config: finalPrintConfig,
        updated_by: currentUserName
      });

      showSuccessAlert(
        'Work ID Updated',
        res.message || `Work ID '${editingForm.form_id}' successfully updated!`
      );
      setWorkOrderMode(null);
      loadFormsForStage(stage.stage_number);
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update work form.');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  // Direct Assign / Re-assign Work Order for Stage
  const handleAssignWorkOrder = async (form) => {
    if (!form || !stage) return;
    const sNum = stage.stage_number;

    // Check if another work order is ALREADY assigned to this stage
    const alreadyAssigned = stageForms.find(
      (f) => Boolean(f.assigned_operator_id) && String(f.id) !== String(form.id) && String(f.form_id) !== String(form.form_id)
    );

    if (alreadyAssigned) {
      const confirmed = await showConfirmAlert({
        title: 'Re-assign Work ID?',
        text: `Stage #${sNum} is currently assigned to Work ID '${alreadyAssigned.form_id}'. Do you want to re-assign Stage #${sNum} to '${form.form_id}'?`,
        icon: 'question',
        confirmButtonText: 'OK, Re-assign',
        cancelButtonText: 'Cancel'
      });
      if (!confirmed) return;

      try {
        // 1. Unassign previous work order
        await stageManagementService.assignForm(alreadyAssigned.id, {
          assigned_operator_id: null,
          assigned_operator_name: null,
          reassigned_by: currentUserName,
          status: 'ACTIVE'
        });

        // 2. Assign selected work order to Stage
        await stageManagementService.assignForm(form.id, {
          assigned_operator_id: `STAGE-${sNum}`,
          assigned_operator_name: `Stage #${sNum}`,
          reassigned_by: currentUserName,
          status: 'IN_PROGRESS'
        });

        showSuccessAlert(
          'Work ID Re-assigned',
          `Work ID '${form.form_id}' successfully assigned to Stage #${sNum}! Previous Work ID '${alreadyAssigned.form_id}' has been unassigned.`
        );
        loadFormsForStage(sNum);
      } catch (err) {
        showErrorAlert('Re-assignment Failed', err.message || 'Failed to re-assign work order.');
      }
    } else {
      const confirmed = await showConfirmAlert({
        title: 'Assign Work ID?',
        text: `Assign Work ID '${form.form_id}' to Stage #${sNum}?`,
        icon: 'question',
        confirmButtonText: 'OK, Assign',
        cancelButtonText: 'Cancel'
      });
      if (!confirmed) return;

      try {
        await stageManagementService.assignForm(form.id, {
          assigned_operator_id: `STAGE-${sNum}`,
          assigned_operator_name: `Stage #${sNum}`,
          reassigned_by: currentUserName,
          status: 'IN_PROGRESS'
        });

        showSuccessAlert(
          'Work ID Assigned',
          `Work ID '${form.form_id}' successfully assigned to Stage #${sNum}!`
        );
        loadFormsForStage(sNum);
      } catch (err) {
        showErrorAlert('Assignment Failed', err.message || 'Failed to assign work order.');
      }
    }
  };

  const handleQuickUnassign = async (form) => {
    const confirmed = await showConfirmAlert({
      title: 'Unassign Work Order?',
      text: `Unassign Work ID '${form.form_id}' from Stage #${stage?.stage_number || form.stage_number}? The Work ID will remain available in Stage #${stage?.stage_number || form.stage_number}.`,
      icon: 'question',
      confirmButtonText: 'Yes, Unassign',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      await stageManagementService.assignForm(form.id, {
        assigned_operator_id: null,
        assigned_operator_name: null,
        reassigned_by: currentUserName,
        status: 'ACTIVE'
      });
      showSuccessAlert('Unassigned', `Work ID '${form.form_id}' has been unassigned from Stage #${stage?.stage_number || form.stage_number}.`);
      if (stage) loadFormsForStage(stage.stage_number);
    } catch (err) {
      showErrorAlert('Unassign Failed', err.message || 'Failed to unassign work form.');
    }
  };

  const isFormActive = (form) => {
    if (!form || !form.status) return false;
    const st = String(form.status).toUpperCase();
    return st === 'ACTIVE' || st === 'IN_PROGRESS';
  };

  const handleToggleFormStatus = async (form) => {
    if (!form) return;
    const currentIsActive = isFormActive(form);
    const newStatus = currentIsActive ? 'DE-ACTIVE' : 'ACTIVE';
    const targetId = form.id || form.form_id;

    setTogglingStatusId(targetId);
    try {
      await stageManagementService.updateForm(targetId, {
        status: newStatus,
        updated_by: currentUserName
      });
      setStageForms((prevForms) =>
        prevForms.map((f) => {
          if (f.id === form.id || f.form_id === form.form_id) {
            return {
              ...f,
              status: newStatus,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            };
          }
          return f;
        })
      );
      if (viewingForm && (viewingForm.id === form.id || viewingForm.form_id === form.form_id)) {
        setViewingForm((prev) => ({
          ...prev,
          status: newStatus,
          updated_by: currentUserName,
          updated_at: new Date().toISOString()
        }));
      }
      showSuccessAlert(
        'Status Updated',
        `Work ID '${form.form_id}' status changed to ${newStatus}!`
      );
    } catch (err) {
      showErrorAlert('Status Update Failed', err.message || 'Failed to update work order status.');
      if (stage) loadFormsForStage(stage.stage_number);
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDeleteForm = async (form) => {
    const confirmed = await showConfirmAlert({
      title: 'Delete Work Form?',
      text: `Are you sure you want to delete Work Form '${form.form_id}' (${form.form_title})?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete Form',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await stageManagementService.deleteForm(form.id);
      showSuccessAlert('Form Deleted', res.message || `Work Form '${form.form_id}' deleted successfully!`);
      loadFormsForStage(stage.stage_number);
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete work form.');
    }
  };

  const handleDeleteStage = async () => {
    const confirmed = await showConfirmAlert({
      title: 'Delete Production Stage?',
      text: `Are you sure you want to delete Stage #${stage.stage_number} '${stage.stage_name}'?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete Stage',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      await stageManagementService.deleteStage(stage.id);
      showSuccessAlert('Deleted', `Stage #${stage.stage_number} has been deleted.`);
      navigate('/stage-management');
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Could not delete stage.');
    }
  };

  if (loading) {
    return (
      <div className="py-5 text-center">
        <LoadingSpinner text="Loading Stage Details..." />
      </div>
    );
  }

  if (!stage) return null;

  const isActive =
    stage.status === true ||
    stage.status === 'true' ||
    stage.status === 'ACTIVE' ||
    stage.status === 1 ||
    stage.status === '1';

  return (
    <div className="container-fluid py-2">
      {/* Breadcrumb & Navigation */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary text-white font-mono px-2.5 py-1 fs-6">
            Stage #{stage.stage_number}
          </span>
          <h4 className="mb-0 fw-bold text-dark">{stage.stage_name}</h4>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1.5 px-3 py-1.5"
            onClick={() => navigate('/stage-management')}
          >
            <i className="ti ti-arrow-left"></i>
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Stage Work Forms & Work Orders Section */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-2.5 px-3.5 border-bottom d-flex align-items-center justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center gap-1.5 shadow-xs px-3 py-1.5"
            onClick={handleOpenCreateForm}
          >
            <i className="ti ti-plus"></i>
            <span>Create Work Order</span>
          </button>
        </div>

        <div className="card-body p-0">
          {formsLoading ? (
            <SkeletonTable rows={5} columns={6} embedded />
          ) : stageForms.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-clipboard-list fs-1 d-block mb-2 text-secondary opacity-50"></i>
              <h5 className="fw-bold text-dark mb-1">No Work Forms Created for Stage #{stage.stage_number}</h5>
              <p className="small text-secondary mb-3">
                Create multiple work forms for Stage #{stage.stage_number}. Once created, {userRoleLabel} can assign Work IDs to operators.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary fw-semibold shadow-xs px-3 py-2"
                onClick={handleOpenCreateForm}
              >
                <i className="ti ti-plus me-1.5"></i>Create Work Order
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }} className="text-center">S.No</th>
                    <th style={{ minWidth: '160px' }}>Work ID / Form ID</th>
                    <th style={{ minWidth: '160px' }}>Batch & Target</th>
                    <th style={{ minWidth: '180px' }}>Assign Status</th>
                    <th>Status</th>
                    <th className="text-end pe-3" style={{ minWidth: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stageForms
                    .slice((formsPage - 1) * formsPageSize, formsPage * formsPageSize)
                    .map((form, fIdx) => {
                      const actualIdx = (formsPage - 1) * formsPageSize + fIdx + 1;
                      return (
                    <tr key={form.id || form.form_id || fIdx}>
                      <td className="text-center text-secondary small fw-bold">{actualIdx}</td>
                      <td>
                        <span className="badge bg-light text-primary border font-mono fs-6 px-2.5 py-1.5 d-inline-flex align-items-center gap-1 shadow-2xs">
                          <i className="ti ti-id-badge text-primary"></i>
                          {form.form_id}
                        </span>
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark font-mono">{form.batch_no || 'BATCH-2026-01'}</div>
                        {!isStage8 && form.month_year && (
                          <div className="text-secondary font-mono" style={{ fontSize: '11px' }}>
                            <i className="ti ti-calendar me-1 text-primary"></i>{form.month_year}
                          </div>
                        )}
                        <div className="text-muted text-xs">
                          Target: <strong>{form.target_quantity || 100}</strong> Meters
                        </div>
                      </td>
                      <td>
                        {form.assigned_operator_id ? (
                          <div>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 font-sans d-inline-flex align-items-center gap-1">
                              <i className="ti ti-check"></i>
                              <span className="fw-semibold">
                                Assigned (Stage #{stage.stage_number})
                              </span>
                            </span>
                            <div className="text-muted text-xs mt-0.5">
                              Assigned by: {form.reassigned_by || form.assigned_by || 'Admin'}
                            </div>
                          </div>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 font-sans">
                            <i className="ti ti-clock me-1"></i>Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const isActive = isFormActive(form);
                          const isToggling = togglingStatusId === (form.id || form.form_id);
                          return (
                            <button
                              type="button"
                              onClick={() => handleToggleFormStatus(form)}
                              disabled={isToggling}
                              className={`btn btn-sm px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1.5 fw-semibold shadow-2xs ${
                                isActive
                                  ? 'btn-success-subtle text-success border border-success-subtle'
                                  : 'btn-secondary-subtle text-secondary border border-secondary-subtle'
                              }`}
                              style={{
                                fontSize: '11.5px',
                                cursor: isToggling ? 'not-allowed' : 'pointer',
                                minWidth: '100px',
                                justifyContent: 'center'
                              }}
                              title={isActive ? 'Click to De-activate' : 'Click to Activate'}
                            >
                              {isToggling ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  style={{ width: '0.75rem', height: '0.75rem' }}
                                ></span>
                              ) : (
                                <i
                                  className={`ti ${
                                    isActive
                                      ? 'ti-toggle-right text-success fs-5'
                                      : 'ti-toggle-left text-muted fs-5'
                                  }`}
                                ></i>
                              )}
                              <span>{isActive ? 'ACTIVE' : 'DE-ACTIVE'}</span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {form.assigned_operator_id ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning d-inline-flex align-items-center gap-1 px-2.5 py-1 font-sans fw-semibold"
                              onClick={() => handleQuickUnassign(form)}
                              title="Unassign Work Order"
                            >
                              <i className="ti ti-user-x"></i>
                              <span>Unassign</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-2.5 py-1 font-sans fw-semibold shadow-2xs"
                              onClick={() => handleAssignWorkOrder(form)}
                              title="Assign Work Order to Stage Operator"
                            >
                              <i className="ti ti-user-plus"></i>
                              <span>Assign</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-1 font-sans ms-1"
                            onClick={() => handleOpenViewForm(form)}
                            title="View Work Order"
                          >
                            <i className="ti ti-eye"></i>
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-action-delete border-0 text-danger ms-1"
                            onClick={() => handleDeleteForm(form)}
                            title="Delete Work Form"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          {!formsLoading && stageForms.length > 0 && (
            <Pagination
              currentPage={formsPage}
              totalItems={stageForms.length}
              pageSize={formsPageSize}
              onPageChange={setFormsPage}
              onPageSizeChange={(newSize) => {
                setFormsPageSize(newSize);
                setFormsPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INLINE WORK ORDER PANEL (Create, Edit, View on the page side)            */}
      {/* ========================================================================= */}
      {workOrderMode && (
        <div ref={workOrderSectionRef} className="card shadow-sm border-0 mb-4 mt-4">
          <div className="card-header bg-white py-3 px-3.5 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span
                className={`badge px-2.5 py-1 font-mono ${
                  workOrderMode === 'create'
                    ? 'bg-primary text-white'
                    : workOrderMode === 'edit'
                    ? 'bg-warning-subtle text-warning-emphasis border border-warning'
                    : 'bg-info-subtle text-info-emphasis border border-info'
                }`}
              >
                {workOrderMode.toUpperCase()}
              </span>
              <h5 className="mb-0 fw-bold text-dark">
                {workOrderMode === 'create' && `Create Work Order for Stage #${stage.stage_number}: ${stage.stage_name}`}
                {workOrderMode === 'edit' && `Edit Work Order: ${editingForm?.form_id}`}
                {workOrderMode === 'view' && `Work Order Details: ${viewingForm?.form_id}`}
              </h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              {workOrderMode === 'view' && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 shadow-2xs"
                  onClick={() => handleOpenEditForm(viewingForm)}
                >
                  <i className="ti ti-edit"></i>
                  <span>Edit this Work Order</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1 text-muted"
                onClick={() => setWorkOrderMode(null)}
                title="Close"
              >
                <i className="ti ti-x"></i>
                <span>Close</span>
              </button>
            </div>
          </div>

          <div className="card-body p-3.5">
            {/* 1. CREATE MODE */}
            {workOrderMode === 'create' && (
              <form onSubmit={handleCreateForm} className="m-0">
                {isBodyPrintStage ? (
                  <MeterInteractiveTextEditor
                    splitLayout={true}
                    actualPrintOnly={isStage4}
                    hideControls={isStage4}
                    variableTexts={newVariableTexts}
                    onChangeTexts={setNewVariableTexts}
                    logos={newLogos}
                    onChangeLogos={setNewLogos}
                    qrCodes={newQrCodes}
                    onChangeQrCodes={setNewQrCodes}
                    actualPrintImage={newActualPrintImage}
                    onChangeActualPrintImage={setNewActualPrintImage}
                    actualPrintImageName={newActualPrintImageName}
                    onChangeActualPrintImageName={setNewActualPrintImageName}
                    leftTopContent={
                      <div>
                        <div className="row g-2 mb-2">
                          <div className="col-md-5">
                            <label className="form-label fw-semibold text-dark small mb-1">Work ID / Form ID *</label>
                            <input
                              type="text"
                              className="form-control form-control-sm font-mono fw-bold text-primary"
                              value={newFormId}
                              onChange={(e) => setNewFormId(e.target.value)}
                              placeholder="e.g. WORK-STG9-001"
                              required
                            />
                            <small className="text-muted text-xs">Stage-wise unique Work ID</small>
                          </div>
                          <div className="col-md-7">
                            <label className="form-label fw-semibold text-dark small mb-1">Form / Work Title *</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={newFormTitle}
                              onChange={(e) => setNewFormTitle(e.target.value)}
                              placeholder="e.g. Meter Box Body Print Work Order"
                              required
                            />
                          </div>
                        </div>

                        <div className="row g-2 mb-2">
                          <div className="col-md-5">
                            <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Production Batch No *</label>
                            <input
                              type="text"
                              className="form-control form-control-sm font-mono"
                              value={newBatchNo}
                              onChange={(e) => setNewBatchNo(e.target.value)}
                              placeholder="e.g. BATCH-2026-01"
                              required
                            />
                          </div>
                          <div className="col-md-7">
                            <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Target Quantity (Meters) *</label>
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm"
                              value={newTargetQty}
                              onChange={(e) => setNewTargetQty(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {!isStage4 && !isStage8 && (
                          <div className="row g-2 mb-2">
                            <div className="col-md-5">
                              <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Month and Year</label>
                              <input
                                type="text"
                                className="form-control form-control-sm font-mono"
                                value={newMonthYear}
                                onChange={(e) => setNewMonthYear(e.target.value)}
                                placeholder="MM/YYYY"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    leftBottomContent={
                      <div className="d-flex align-items-center justify-content-end pt-3 border-top mt-2">
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary px-4 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5 rounded-2 shadow-xs"
                          disabled={formSubmitting}
                          style={{ minHeight: '36px' }}
                        >
                          {formSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm"></span>
                              <span>Creating Work Order...</span>
                            </>
                          ) : (
                            <>
                              <i className="ti ti-plus fs-6"></i>
                              <span>Create Work Order</span>
                            </>
                          )}
                        </button>
                      </div>
                    }
                  />
                ) : (
                  <div className={isStage8 ? 'mx-auto' : ''} style={isStage8 ? { maxWidth: '760px' } : undefined}>
                    <div className={isStage8 ? 'row g-2 mb-3' : ''}>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">Work ID / Form ID *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold text-primary"
                          value={newFormId}
                          onChange={(e) => setNewFormId(e.target.value)}
                          placeholder="e.g. WORK-STG1-001"
                          required
                        />
                      </div>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">Form Title *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={newFormTitle}
                          onChange={(e) => setNewFormTitle(e.target.value)}
                          placeholder="e.g. Batch Work Order"
                          required
                        />
                      </div>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className={isStage8 ? 'col-12 col-sm-6' : 'col-6'}>
                        <label className="form-label fw-semibold text-dark small text-nowrap">Batch No *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          value={newBatchNo}
                          onChange={(e) => setNewBatchNo(e.target.value)}
                          required
                        />
                      </div>
                      <div className={isStage8 ? 'col-12 col-sm-6' : 'col-6'}>
                        <label className="form-label fw-semibold text-dark small text-nowrap">Target Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={newTargetQty}
                          onChange={(e) => setNewTargetQty(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {isStage8 && (
                      <Stage08FieldToggles
                        statuses={newStage08FieldStatuses}
                        onChange={(key, active) =>
                          setNewStage08FieldStatuses((current) => ({ ...current, [key]: active }))
                        }
                      />
                    )}
                    {!isStage4 && !isStage8 && (
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold text-dark small text-nowrap">Month and Year</label>
                          <input
                            type="text"
                            className="form-control form-control-sm font-mono"
                            value={newMonthYear}
                            onChange={(e) => setNewMonthYear(e.target.value)}
                            placeholder="MM/YYYY"
                          />
                        </div>
                      </div>
                    )}
                    <div className={isStage8 ? 'row g-2 mb-3' : ''}>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">Description</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={isStage8 ? 3 : 2}
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder={isStage8 ? 'Enter work order description...' : undefined}
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => setWorkOrderMode(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={formSubmitting}
                      >
                        {formSubmitting ? 'Creating...' : 'Create Work Form'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* 2. EDIT MODE (Order ID non-editable / read-only) */}
            {workOrderMode === 'edit' && editingForm && (
              <form onSubmit={handleEditForm} className="m-0">
                {isBodyPrintStage ? (
                  <MeterInteractiveTextEditor
                    splitLayout={true}
                    actualPrintOnly={isStage4}
                    hideControls={isStage4}
                    variableTexts={editVariableTexts}
                    onChangeTexts={setEditVariableTexts}
                    logos={editLogos}
                    onChangeLogos={setEditLogos}
                    qrCodes={editQrCodes}
                    onChangeQrCodes={setEditQrCodes}
                    actualPrintImage={editActualPrintImage}
                    onChangeActualPrintImage={setEditActualPrintImage}
                    actualPrintImageName={editActualPrintImageName}
                    onChangeActualPrintImageName={setEditActualPrintImageName}
                    workOrderId={editFormId}
                    leftTopContent={
                      <div>
                        <div className="row g-2 mb-2">
                          <div className="col-md-5">
                            <label className="form-label fw-semibold text-dark small mb-1">
                              Work ID (Read-only) <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm font-mono fw-bold bg-light text-muted"
                              value={editFormId}
                              disabled
                              readOnly
                            />
                            <small className="text-muted text-xs">Work ID cannot be changed</small>
                          </div>
                          <div className="col-md-7">
                            <label className="form-label fw-semibold text-dark small mb-1">Form / Work Title *</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editFormTitle}
                              onChange={(e) => setEditFormTitle(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="row g-2 mb-2">
                          <div className="col-md-5">
                            <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Production Batch No *</label>
                            <input
                              type="text"
                              className="form-control form-control-sm font-mono"
                              value={editBatchNo}
                              onChange={(e) => setEditBatchNo(e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-7">
                            <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Target Quantity (Meters) *</label>
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm"
                              value={editTargetQty}
                              onChange={(e) => setEditTargetQty(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {!isStage4 && !isStage8 && (
                          <div className="row g-2 mb-2">
                            <div className="col-md-5">
                              <label className="form-label fw-semibold text-dark small mb-1 text-nowrap">Month and Year</label>
                              <input
                                type="text"
                                className="form-control form-control-sm font-mono"
                                value={editMonthYear}
                                onChange={(e) => setEditMonthYear(e.target.value)}
                                placeholder="MM/YYYY"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    leftBottomContent={
                      <div className="d-flex align-items-center justify-content-end pt-3 border-top mt-2">
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary px-4 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5 rounded-2 shadow-xs"
                          disabled={editFormSubmitting}
                          style={{ minHeight: '36px' }}
                        >
                          {editFormSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm"></span>
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <i className="ti ti-device-floppy fs-6"></i>
                              <span>Update Work Order</span>
                            </>
                          )}
                        </button>
                      </div>
                    }
                  />
                ) : (
                  <div className={isStage8 ? 'mx-auto' : ''} style={isStage8 ? { maxWidth: '760px' } : undefined}>
                    <div className={isStage8 ? 'row g-2 mb-3' : ''}>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">
                          Work ID (Read-only) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono fw-bold bg-light text-muted"
                          value={editFormId}
                          disabled
                          readOnly
                        />
                        <small className="text-muted text-xs">Work ID cannot be changed</small>
                      </div>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">Form Title *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editFormTitle}
                          onChange={(e) => setEditFormTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className={isStage8 ? 'col-12 col-sm-6' : 'col-6'}>
                        <label className="form-label fw-semibold text-dark small text-nowrap">Batch No *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          value={editBatchNo}
                          onChange={(e) => setEditBatchNo(e.target.value)}
                          required
                        />
                      </div>
                      <div className={isStage8 ? 'col-12 col-sm-6' : 'col-6'}>
                        <label className="form-label fw-semibold text-dark small text-nowrap">Target Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={editTargetQty}
                          onChange={(e) => setEditTargetQty(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {isStage8 && (
                      <Stage08FieldToggles
                        statuses={editStage08FieldStatuses}
                        onChange={(key, active) =>
                          setEditStage08FieldStatuses((current) => ({ ...current, [key]: active }))
                        }
                      />
                    )}
                    {!isStage4 && !isStage8 && (
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold text-dark small text-nowrap">Month and Year</label>
                          <input
                            type="text"
                            className="form-control form-control-sm font-mono"
                            value={editMonthYear}
                            onChange={(e) => setEditMonthYear(e.target.value)}
                            placeholder="MM/YYYY"
                          />
                        </div>
                      </div>
                    )}
                    <div className={isStage8 ? 'row g-2 mb-3' : ''}>
                      <div className={isStage8 ? 'col-12 col-md-6' : 'mb-3'}>
                        <label className="form-label fw-semibold text-dark small">Description</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={isStage8 ? 3 : 2}
                          value={editFormDescription}
                          onChange={(e) => setEditFormDescription(e.target.value)}
                          placeholder={isStage8 ? 'Enter work order description...' : undefined}
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => setWorkOrderMode(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={editFormSubmitting}
                      >
                        {editFormSubmitting ? 'Saving...' : 'Update Work Form'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* 3. VIEW MODE */}
            {workOrderMode === 'view' && viewingForm && (
              <div>
                <div className="row g-3 mb-3 pb-3 border-bottom">
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">Work ID:</span>
                      <span className="text-primary fw-semibold fs-6 d-inline-flex align-items-center gap-1">
                        <i className="ti ti-id-badge me-1"></i>{viewingForm.form_id}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">Form Title:</span>
                      <span className="text-dark fs-6 fw-semibold d-block">{viewingForm.form_title}</span>
                      {viewingForm.description && (
                        <small className="text-secondary d-block mt-0.5">{viewingForm.description}</small>
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">Batch & Target:</span>
                      <span className="text-dark fs-6 fw-semibold">{viewingForm.batch_no || '-'}</span>
                      <span className="text-secondary fs-6 ms-2">{viewingForm.target_quantity || 0} Meters</span>
                      {!isStage8 && viewingForm.month_year && (
                        <div className="text-muted mt-1" style={{ fontSize: '11.5px' }}>
                          <i className="ti ti-calendar me-1 text-primary"></i>Mfg Date: {viewingForm.month_year}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3 pb-3 border-bottom">
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">Assign Status:</span>
                      {viewingForm.assigned_operator_id ? (
                        <div>
                          <span className="badge fs-6 bg-success-subtle text-success border border-success-subtle px-2 py-1 font-sans">
                            <i className="ti ti-check me-1"></i>Assigned (Stage #{stage.stage_number})
                          </span>
                          <div className="text-muted small mt-1">
                            Assigned by: {viewingForm.reassigned_by || viewingForm.assigned_by || 'Admin'}
                          </div>
                        </div>
                      ) : (
                        <span className="badge fs-6 bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 font-sans">
                          <i className="ti ti-clock me-1"></i>Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">
                        <i className="ti ti-user-plus me-1"></i>Created By
                      </span>
                      <div className="text-dark fs-6 fw-medium">
                        {viewingForm.created_by || 'AdminIT (EMP001)'}
                      </div>
                      <span className="text-secondary text-xs d-block mt-1">
                        <i className="ti ti-calendar me-1"></i>{formatDateTimeDDMMYYYY(viewingForm.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="px-2 py-2 h-100">
                      <span className="text-muted small d-block mb-1">
                        <i className="ti ti-refresh me-1"></i>Last Updated By
                      </span>
                      <div className="text-dark fs-6 fw-medium">
                        {viewingForm.updated_by || viewingForm.created_by || 'AdminIT (EMP001)'}
                      </div>
                      <span className="text-secondary text-xs d-block mt-1">
                        <i className="ti ti-clock me-1"></i>{formatDateTimeDDMMYYYY(viewingForm.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {isStage8 && (
                  <div className="mb-3 pb-3 border-bottom">
                    <h6 className="fw-bold text-dark mb-3">PVC Seal Field Status</h6>
                    <div className="row g-2">
                      {STAGE_08_FIELDS.map(({ key, label }) => {
                        const isActive = viewingForm.print_config?.stage08FieldStatuses?.[key] ?? true;
                        return (
                          <div className="col-md-6" key={key}>
                            <div className="d-flex align-items-center justify-content-between gap-3 border-bottom px-2 py-2">
                              <span className="fs-6 fw-normal text-dark">{label}</span>
                              <span
                                className={`badge fs-6 ${
                                  isActive
                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                    : 'bg-secondary-subtle text-secondary border'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isBodyPrintStage && viewingForm.print_config && (
                  <div className="pb-3 mb-3">
                    <MeterInteractiveTextEditor
                      readOnly={true}
                      actualPrintOnly={isStage4}
                      variableTexts={viewingForm.print_config.variableTexts || []}
                      logos={viewingForm.print_config.logos || []}
                      qrCodes={viewingForm.print_config.qrCodes || []}
                      actualPrintImage={viewingForm.print_config.actualPrintImageUrl || null}
                      hideHeader={false}
                    />
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
