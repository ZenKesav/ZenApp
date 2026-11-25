import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/store';
import { stageManagementService } from '../../services/apiServices';
import { userService } from '../../services/admin/userService';
import { Modal, SkeletonTable, Pagination } from '../../components/CommonComponents';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/swal';
import { getUserAssignedStages } from '../../utils/stageUtils';
import MeterBodyPrintConsole from '../stages/stage09-meter-box-print/MeterBodyPrintConsole';
import MeterInteractiveTextEditor from '../../components/stages/stage09-meter-box-print/MeterBodyPrint/MeterInteractiveTextEditor';
import { UTILITY_LOGO_OPTIONS } from '../../components/stages/stage09-meter-box-print/MeterBodyPrint/UtilityLogos';

export default function StageManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rawRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const isSupervisor = rawRole === 'SUPERVISOR' || rawRole.includes('SUPERVISOR');
  const isAdmin = rawRole === 'ADMIN' || rawRole.includes('ADMIN') || rawRole.includes('IT');
  const userRoleLabel = isSupervisor ? 'Supervisor' : (isAdmin ? 'Admin(IT)' : 'Admin');
  const currentUserEmail = user?.email || user?.employee_id || 'admin@zenmeter.com';
  const currentUserName = user?.name ? `${user.name} (${user.employee_id || userRoleLabel})` : (user?.user_name || `${userRoleLabel} (EMP001)`);

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Stage Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stageNumber, setStageNumber] = useState(1);
  const [stageName, setStageName] = useState('');
  const [description, setDescription] = useState('');
  const [lineType, setLineType] = useState('Main Meter Assembly Line');
  const [submitting, setSubmitting] = useState(false);

  // Edit Stage Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [editStageNumber, setEditStageNumber] = useState(1);
  const [editStageName, setEditStageName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLineType, setEditLineType] = useState('Main Meter Assembly Line');
  const [editStatus, setEditStatus] = useState(true);

  // Stage Wise View & Forms Modal state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingStage, setViewingStage] = useState(null);
  const [stageForms, setStageForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [operatorsList, setOperatorsList] = useState([]);

  // Create Work Form Modal state
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [newFormId, setNewFormId] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('BATCH-2026-01');
  const [newTargetQty, setNewTargetQty] = useState(500);
  const [newDescription, setNewDescription] = useState('');
  const DEFAULT_VARIABLE_TEXTS = [
    {
      id: 'vt-1',
      text: 'ZENMETER SMART METER',
      x: 95,
      y: 42,
      leftPercent: 22.6,
      topPercent: 9.3,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#ffffff'
    }
  ];
  const [newVariableTexts, setNewVariableTexts] = useState(DEFAULT_VARIABLE_TEXTS);
  const [newLogos, setNewLogos] = useState([]);
  const [newQrCodes, setNewQrCodes] = useState([]);
  const [newActualPrintImage, setNewActualPrintImage] = useState(null);
  const [newActualPrintImageName, setNewActualPrintImageName] = useState('');
  const [showCreateMeterSide, setShowCreateMeterSide] = useState(true);
  const [newCustomLogoUrl, setNewCustomLogoUrl] = useState(null);
  const [newLogoPos, setNewLogoPos] = useState({ leftPercent: 6.5, topPercent: 4.0 });
  const [newQrValue, setNewQrValue] = useState('');
  const [newQrPos, setNewQrPos] = useState({ leftPercent: 72, topPercent: 12.8 });

  // Edit Work Form Modal state
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [previewingForm, setPreviewingForm] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [editFormId, setEditFormId] = useState('');
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editTargetQty, setEditTargetQty] = useState(100);
  const [editFormDescription, setEditFormDescription] = useState('');
  const [editVariableTexts, setEditVariableTexts] = useState(DEFAULT_VARIABLE_TEXTS);
  const [editLogos, setEditLogos] = useState([]);
  const [editQrCodes, setEditQrCodes] = useState([]);
  const [editActualPrintImage, setEditActualPrintImage] = useState(null);
  const [editActualPrintImageName, setEditActualPrintImageName] = useState('');
  const [showEditMeterSide, setShowEditMeterSide] = useState(true);
  const [editCustomLogoUrl, setEditCustomLogoUrl] = useState(null);
  const [editLogoPos, setEditLogoPos] = useState({ leftPercent: 6.5, topPercent: 4.0 });
  const [editQrValue, setEditQrValue] = useState('');
  const [editQrPos, setEditQrPos] = useState({ leftPercent: 72, topPercent: 12.8 });
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isLaserPreviewOpen, setIsLaserPreviewOpen] = useState(false);

  // Check if active viewing stage is Meter Box Body Print or NIC Card Inside Print
  const isStage4 = Boolean(viewingStage && Number(viewingStage.stage_number) === 4);
  const isBodyPrintStage = viewingStage && (
    (viewingStage.stage_name && (viewingStage.stage_name.toLowerCase().includes('body print') || viewingStage.stage_name.toLowerCase().includes('inside print'))) ||
    Number(viewingStage.stage_number) === 4 ||
    Number(viewingStage.stage_number) === 7 ||
    Number(viewingStage.stage_number) === 9
  );

  const [togglingStatusId, setTogglingStatusId] = useState(null);

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

  const loadStages = () => {
    setLoading(true);
    stageManagementService.getStages().then(res => {
      const data = Array.isArray(res) ? res : (res?.data || res?.stages || []);
      const sortedData = [...data].sort((a, b) => Number(a.stage_number) - Number(b.stage_number));
      setStages(sortedData);
      // Auto-compute next stage number for create modal
      const nextNum = sortedData.length > 0 ? Math.max(...sortedData.map(s => Number(s.stage_number) || 0)) + 1 : 1;
      setStageNumber(nextNum);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleCreateStage = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await stageManagementService.createStage({
        stage_number: Number(stageNumber),
        stage_name: stageName,
        description: description,
        line_type: lineType,
        hardware_station: `Station-${String(stageNumber).padStart(2, '0')}`,
        status: true, // Automatically set to true on DB save
        created_by: currentUserEmail
      });

      showSuccessAlert('Stage Created', res.message || `Production Stage #${stageNumber} created successfully!`);
      setIsCreateOpen(false);
      setStageName('');
      setDescription('');
      loadStages();
    } catch (err) {
      showErrorAlert('Create Stage Failed', err.message || 'Failed to create stage.');
    } finally {
      setSubmitting(false);
    }
  };

  // Change Detection Ref
  const initialStageRef = useRef(null);

  const isStageChanged = Boolean(
    initialStageRef.current &&
    editStageNumber &&
    Number(editStageNumber) > 0 && (
      Number(editStageNumber) !== initialStageRef.current.stageNumber ||
      editStageName.trim() !== initialStageRef.current.stageName ||
      editDescription.trim() !== initialStageRef.current.description ||
      editLineType !== initialStageRef.current.lineType ||
      editStatus !== initialStageRef.current.status
    )
  );

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!editingStage) return;
    setSubmitting(true);
    try {
      const res = await stageManagementService.updateStage(editingStage.id, {
        stage_number: Number(editStageNumber),
        stage_name: editStageName,
        description: editDescription,
        line_type: editLineType,
        hardware_station: editingStage.hardware_station || `Station-${String(editStageNumber).padStart(2, '0')}`,
        status: editStatus,
        updated_by: currentUserEmail
      });

      showSuccessAlert('Stage Updated', res.message || `Production Stage #${editStageNumber} updated successfully!`);
      setIsEditOpen(false);
      loadStages();
    } catch (err) {
      showErrorAlert('Update Stage Failed', err.message || 'Failed to update stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStage = async (sObj) => {
    const confirmed = await showConfirmAlert({
      title: 'Delete Production Stage?',
      text: `Are you sure you want to delete Stage #${sObj.stage_number} '${sObj.stage_name}'?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete Stage',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await stageManagementService.deleteStage(sObj.id);
      showSuccessAlert('Stage Deleted', res.message || `Stage '${sObj.stage_name}' deleted successfully!`);
      loadStages();
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete stage.');
    }
  };

  // Stage Wise View & Forms Logic
  const loadFormsForStage = (stageNum) => {
    setFormsLoading(true);
    stageManagementService.getForms({ stage_number: stageNum })
      .then(res => {
        const list = res?.forms || res?.data || [];
        setStageForms(list);
        setFormsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stage forms:', err);
        setFormsLoading(false);
      });
  };

  const loadOperators = () => {
    userService.getUsers().then(res => {
      const list = Array.isArray(res) ? res : (res?.users || res?.data || []);
      const ops = list.filter(u => {
        const r = (u.role || '').toUpperCase();
        return r === 'OPERATOR' || (r.includes('OPERATOR') && !r.includes('SUPERVISOR') && !r.includes('ADMIN'));
      });
      setOperatorsList(ops);
    }).catch(err => console.error('Error fetching operators:', err));
  };

  const handleOpenView = (sObj) => {
    navigate(`/stage-management/view/${sObj.stage_number}`);
  };

  // Check if an operator is mapped to a specific stage number
  const isOperatorForStage = (op, sNum) => {
    if (!op || !sNum) return false;
    if (Number(op.stage_id) === Number(sNum)) return true;
    if (op.assigned_stage) {
      const raw = String(op.assigned_stage).toLowerCase();
      if (
        raw.includes(`${sNum} stage`) ||
        raw.includes(`stage ${sNum}`) ||
        raw.includes(`stage-${sNum}`) ||
        raw.split(',').some(p => p.trim() === String(sNum))
      ) {
        return true;
      }
    }
    if (Array.isArray(op.stageDetailsList) && op.stageDetailsList.length > 0) {
      if (op.stageDetailsList.some(s => Number(s.stage_number || s.id) === Number(sNum))) {
        return true;
      }
    }
    try {
      const userStages = getUserAssignedStages(op);
      if (userStages && userStages.some(s => Number(s.id) === Number(sNum))) return true;
    } catch (e) { }
    return false;
  };

  const handleOpenCreateForm = () => {
    if (!viewingStage) return;
    const sNum = viewingStage.stage_number;
    const seq = String(stageForms.length + 1).padStart(3, '0');
    setNewFormId(`WORK-STG${sNum}-${seq}`);
    setNewFormTitle(`${viewingStage.stage_name} Work Order`);
    setNewBatchNo(`BATCH-2026-${String(stageForms.length + 1).padStart(2, '0')}`);
    setNewTargetQty(500);
    setNewDescription(viewingStage.description || 'Front full print');
    setNewVariableTexts([
      {
        id: 'vt-1',
        text: (viewingStage.stage_name || 'ZENMETER SMART METER').toUpperCase(),
        x: 95,
        y: 42,
        leftPercent: 22.6,
        topPercent: 9.3,
        fontSize: 13,
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
        value: `WORK-STG${sNum}-${seq}|BATCH-2026-${String(stageForms.length + 1).padStart(2, '0')}|TYPE:Z1A02FP3`,
        size: 56,
        color: '#ffffff',
        bgColor: 'transparent',
        leftPercent: 72,
        topPercent: 12.8
      }
    ]);
    setNewCustomLogoUrl(null);
    setNewLogoPos({ leftPercent: 6.5, topPercent: 4.0 });
    setNewQrValue(`WORK-STG${sNum}-${seq}|BATCH-2026-${String(stageForms.length + 1).padStart(2, '0')}|TYPE:Z1A02FP3`);
    setNewQrPos({ leftPercent: 72, topPercent: 12.8 });
    setNewActualPrintImage(null);
    setNewActualPrintImageName('');
    setShowCreateMeterSide(true);
    setIsCreateFormOpen(true);
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!viewingStage) return;

    if (isStage4 && !newActualPrintImage) {
      showErrorAlert(
        'Validation Error',
        'Actual Print layout image/PDF is required for Stage #4. Please upload an Actual Print file before creating.'
      );
      return;
    }

    setFormSubmitting(true);
    try {
      const isBodyPrint =
        (viewingStage.stage_name && (viewingStage.stage_name.toLowerCase().includes('body print') || viewingStage.stage_name.toLowerCase().includes('inside print'))) ||
        Number(viewingStage.stage_number) === 4 ||
        Number(viewingStage.stage_number) === 7 ||
        Number(viewingStage.stage_number) === 9;

      const printConfigPayload = isBodyPrint ? {
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
        brandTitle: '',
        serialNo: '',
        imei: '',
        wanComm: '',
        meterTitle: '',
        voltageCurrent: '',
        accuracyClass: '',
        category: '',
        meterType: '',
        propertyOf: '',
        loaNo: '',
        pulseConstant: '',
        mfgDate: '',
        manufacturer: '',
        bisText: ''
      } : null;

      const res = await stageManagementService.createForm({
        form_id: newFormId.trim(),
        stage_number: viewingStage.stage_number,
        stage_name: viewingStage.stage_name,
        form_title: newFormTitle.trim(),
        batch_no: newBatchNo.trim(),
        target_quantity: Number(newTargetQty) || 100,
        description: newDescription.trim(),
        print_config: printConfigPayload,
        assigned_operator_id: null,
        assigned_operator_name: null,
        status: 'ACTIVE',
        created_by: currentUserName
      });

      showSuccessAlert(
        'Work ID Created',
        res.message || `Work ID '${newFormId}' successfully created for Stage #${viewingStage.stage_number}! You can now assign it to operators.`
      );
      setIsCreateFormOpen(false);
      loadFormsForStage(viewingStage.stage_number);
    } catch (err) {
      showErrorAlert('Create Form Failed', err.message || 'Failed to create work form.');
    } finally {
      setFormSubmitting(false);
    }
  };


  const handleOpenEditForm = (form) => {
    setEditingForm(form);
    setEditFormId(form.form_id || '');
    setEditFormTitle(form.form_title || '');
    setEditBatchNo(form.batch_no || 'BATCH-2026-01');
    setEditTargetQty(form.target_quantity || 100);
    setEditFormDescription(form.description || '');

    const existingVTs = form.print_config?.variableTexts;
    if (Array.isArray(existingVTs) && existingVTs.length > 0) {
      setEditVariableTexts(existingVTs);
    } else if (form.print_config?.customLogoText || form.print_config?.logoText) {
      setEditVariableTexts([
        {
          id: 'vt-1',
          text: form.print_config.customLogoText || form.print_config.logoText,
          x: 95,
          y: 42,
          leftPercent: 22.6,
          topPercent: 9.3,
          fontSize: 13,
          fontWeight: 'bold',
          color: '#0f172a'
        }
      ]);
    } else {
      setEditVariableTexts([
        {
          id: 'vt-1',
          text: (form.form_title || 'ZENMETER SMART METER').toUpperCase(),
          x: 95,
          y: 42,
          leftPercent: 22.6,
          topPercent: 9.3,
          fontSize: 13,
          fontWeight: 'bold',
          color: '#0f172a'
        }
      ]);
    }
    const pCfg = form.print_config || {};
    setEditCustomLogoUrl(pCfg.customLogoUrl || null);
    setEditLogoPos(pCfg.logoPos || { leftPercent: 6.5, topPercent: 4.0 });
    setEditQrValue(pCfg.qrValue || `${form.form_id}|BATCH:${form.batch_no || 'BATCH-2026-01'}`);
    setEditQrPos(pCfg.qrPos || { leftPercent: 72, topPercent: 12.8 });
    setEditActualPrintImage(pCfg.actualPrintImageUrl || null);
    setEditActualPrintImageName(pCfg.actualPrintImageName || '');
    setShowEditMeterSide(true);
    setIsEditFormOpen(true);
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
      const isBodyPrint =
        (viewingStage?.stage_name && (viewingStage.stage_name.toLowerCase().includes('body print') || viewingStage.stage_name.toLowerCase().includes('inside print'))) ||
        Number(viewingStage?.stage_number) === 4 ||
        Number(viewingStage?.stage_number) === 7 ||
        Number(viewingStage?.stage_number) === 9;

      const { actualPrintSourceUrl: staleSourceUrl, actualPrintFileType: staleFileType, ...restEditPrintConfig } = editingForm.print_config || {};
      const actualPrintChanged = (editActualPrintImage || null) !== (editingForm.print_config?.actualPrintImageUrl || null);
      const updatedPrintConfig = isBodyPrint ? {
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
        actualPrintImageUrl: editActualPrintImage || null,
        actualPrintImageName: editActualPrintImageName || '',
        customLogoUrl: editCustomLogoUrl || null,
        logoType: editCustomLogoUrl ? 'custom' : (editingForm.print_config?.logoType || 'zenmeter'),
        logoPos: editLogoPos,
        qrValue: editQrValue.trim() || `${editFormId}|BATCH:${editBatchNo}`,
        qrPos: editQrPos,
        customLogoText: editVariableTexts[0]?.text || ''
      } : editingForm.print_config;

      const targetId = editingForm.id || editingForm.form_id;
      const res = await stageManagementService.updateForm(targetId, {
        form_title: editFormTitle.trim(),
        batch_no: editBatchNo.trim(),
        target_quantity: Number(editTargetQty) || 100,
        description: editFormDescription.trim(),
        print_config: updatedPrintConfig
      });

      showSuccessAlert(
        'Work ID Updated',
        res.message || `Work ID '${editingForm.form_id}' successfully updated!`
      );
      setIsEditFormOpen(false);
      if (viewingStage) {
        loadFormsForStage(viewingStage.stage_number);
      }
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update work form.');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  // Direct Assign / Re-assign Work Order for Stage
  const handleAssignWorkOrder = async (form) => {
    if (!form || !viewingStage) return;
    const sNum = viewingStage.stage_number;

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
      text: `Unassign Work ID '${form.form_id}' from Stage #${viewingStage?.stage_number || form.stage_number}? The Work ID will remain available in Stage #${viewingStage?.stage_number || form.stage_number}.`,
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
      showSuccessAlert('Unassigned', `Work ID '${form.form_id}' has been unassigned from Stage #${viewingStage?.stage_number || form.stage_number}.`);
      if (viewingStage) loadFormsForStage(viewingStage.stage_number);
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
      showSuccessAlert(
        'Status Updated',
        `Work ID '${form.form_id}' status changed to ${newStatus}!`
      );
    } catch (err) {
      showErrorAlert('Status Update Failed', err.message || 'Failed to update work order status.');
      if (viewingStage) loadFormsForStage(viewingStage.stage_number);
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
      if (viewingStage) {
        loadFormsForStage(viewingStage.stage_number);
      }
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete work form.');
    }
  };

  const activeStages = stages.filter(s => s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1');
  const mainLineStages = activeStages.filter(s => (s.line_type || '').includes('Main'));
  const nicLineStages = activeStages.filter(s => (s.line_type || '').includes('NIC'));

  const conflictingStage = editingStage && editStageNumber && Number(editStageNumber) !== Number(editingStage.stage_number)
    ? stages.find(s => Number(s.stage_number) === Number(editStageNumber) && s.id !== editingStage.id)
    : null;

  const paginatedStages = stages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      {/* Header & Title */}
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-subtask text-primary"></i>
              <span>Stage Management</span>
            </h1>
          </div>
          <button className="btn btn-primary btn-sm fw-semibold shadow-sm" onClick={() => setIsCreateOpen(true)}>
            <i className="ti ti-plus me-1"></i> Create New Stage
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      {/* <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 border-start border-primary border-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase d-block mb-1">Main Meter Assembly Line</small>
                <h4 className="fw-bold mb-0 text-dark">{mainLineStages.length} Active Stages</h4>
                <small className="text-primary fw-medium font-mono">Stages 1, 5, 6, 7, 8, 9, 10, 11</small>
              </div>
              <div className="p-3 bg-primary-subtle text-primary rounded-3 fs-3">
                <i className="ti ti-cpu"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 border-start border-info border-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase d-block mb-1">NIC Card Preparation Line</small>
                <h4 className="fw-bold mb-0 text-dark">{nicLineStages.length} Active Stages</h4>
                <small className="text-info-emphasis fw-medium font-mono">Stages 2, 3, 4</small>
              </div>
              <div className="p-3 bg-info-subtle text-info-emphasis rounded-3 fs-3">
                <i className="ti ti-wifi"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase d-block mb-1">Total Factory Flow Stages</small>
                <h4 className="fw-bold mb-0 text-dark">{activeStages.length} Total Active</h4>
                <small className="text-success fw-medium font-mono">Configured Production Pipeline</small>
              </div>
              <div className="p-3 bg-success-subtle text-success rounded-3 fs-3">
                <i className="ti ti-list-check"></i>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Stages Data Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : (
        <div className="card shadow-xs table-card">
          <div className="table-responsive">
            <table className="table mb-0 align-middle table-hover">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }} className="text-center">S.No</th>
                  <th style={{ width: '90px' }} className="text-center">Stage No</th>
                  <th>Stage Name & Line Type</th>
                  <th>Process Checks & Description</th>
                  <th style={{ width: '130px' }} className="text-center">Status</th>
                  <th className="text-end pe-4" style={{ minWidth: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="ti ti-subtask fs-2 d-block mb-2 text-secondary opacity-50"></i>
                      <span className="fw-semibold">No production stages found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedStages.map((s, index) => {
                    const active = s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1';
                    const isNic = (s.line_type || '').includes('NIC');

                    return (
                      <tr key={s.id}>
                        {/* Plain text S.No without badge border box */}
                        <td className="fw-semibold text-center text-secondary">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="text-center fw-semibold text-dark font-mono">
                          {s.stage_number} stage
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{s.stage_name}</div>
                          <small className="text-muted text-xs">{s.line_type || 'Main Meter Assembly Line'}</small>
                        </td>
                        <td className="small text-dark text-wrap" style={{ maxWidth: '320px' }}>
                          <span className="text-secondary">{s.description || '-'}</span>
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge px-2.5 py-1.5 font-mono ${active
                              ? 'bg-success-subtle text-success border border-success'
                              : 'bg-secondary-subtle text-secondary border'
                            }`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '98px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            <i className={`ti ${active ? 'ti-circle-check' : 'ti-circle-x'} me-1.5`}></i>
                            {active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <button
                              onClick={() => handleOpenView(s)}
                              className="btn btn-sm btn-action-view border-0 text-primary"
                              title="View Stage Details & Work Forms"
                              style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            >
                              <i className="ti ti-eye fs-5"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteStage(s)}
                              className="btn btn-sm btn-action-delete border-0"
                              title="Delete Stage"
                            >
                              <i className="ti ti-trash fs-5"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={stages.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Create Stage Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Production Stage">
        <form onSubmit={handleCreateStage}>
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold text-dark small">Stage Number *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={stageNumber}
                onChange={(e) => setStageNumber(Number(e.target.value))}
                required
              />
            </div>
            <div className="col-md-8">
              <label className="form-label fw-semibold text-dark small">Stage Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. PCB Code Loading Test"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Process Validation & Checks Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="e.g. Power & boot test, Code loading, serial no., UID, firmware update..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-dark small">Production Line Type *</label>
            <select
              className="form-select"
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
            >
              <option value="Main Meter Assembly Line">Main Meter Assembly Line</option>
              <option value="NIC Card Preparation Line">NIC Card Preparation Line</option>
            </select>
          </div>

          <div className="d-flex justify-content-end gap-2 pt-2">
            <button className="btn btn-light" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating Stage...' : 'Create Stage'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Stage Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Stage #${editingStage?.stage_number}: ${editingStage?.stage_name || ''}`}>
        <form onSubmit={handleUpdateStage}>
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold text-dark small">Stage Number *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={editStageNumber}
                onChange={(e) => setEditStageNumber(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
            <div className="col-md-8">
              <label className="form-label fw-semibold text-dark small">Stage Name *</label>
              <input
                type="text"
                className="form-control"
                value={editStageName}
                onChange={(e) => setEditStageName(e.target.value)}
                required
              />
            </div>
          </div>

          {conflictingStage && (
            <div className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center gap-2 small border-0 bg-warning-subtle text-warning-emphasis rounded-2">
              <i className="ti ti-arrows-left-right fs-4 text-warning flex-shrink-0"></i>
              <div>
                <strong>Stage #{editStageNumber}</strong> is currently assigned to <strong>"{conflictingStage.stage_name}"</strong>.
                Saving will swap <strong>Stage #{editingStage?.stage_number}</strong> and <strong>Stage #{editStageNumber}</strong> in the production table.
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Process Validation & Checks Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Production Line Type *</label>
            <select
              className="form-select"
              value={editLineType}
              onChange={(e) => setEditLineType(e.target.value)}
            >
              <option value="Main Meter Assembly Line">Main Meter Assembly Line</option>
              <option value="NIC Card Preparation Line">NIC Card Preparation Line</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-dark small">Status *</label>
            <select
              className="form-select"
              value={editStatus ? 'true' : 'false'}
              onChange={(e) => setEditStatus(e.target.value === 'true')}
            >
              <option value="true">ACTIVE</option>
              <option value="false">INACTIVE</option>
            </select>
          </div>

          <div className="d-flex justify-content-end gap-2 pt-2">
            <button className="btn btn-light" type="button" onClick={() => setIsEditOpen(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={submitting || !isStageChanged}>
              {submitting ? 'Saving Changes...' : 'Save Stage'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stage Details & Work Forms View Modal */}
      {viewingStage && (
        <Modal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          title={`Stage #${viewingStage.stage_number}: ${viewingStage.stage_name} - Details & Work Allocation`}
          size="xl"
        >
          <div className="p-1">
            {/* Stage Work Forms & Work Orders Section */}
            <div className="card shadow-none border">
              <div className="card-header bg-white py-3 px-3.5 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="ti ti-file-text text-primary"></i>
                    <span>Stage Work Forms & Work Orders (Work IDs)</span>
                    <span className="badge bg-primary text-white font-mono px-2 py-0.5 small shadow-2xs">
                      {stageForms.length} Forms
                    </span>
                  </h6>
                  <small className="text-muted">
                    Work IDs created specifically for Stage #{viewingStage.stage_number}. Admin or Supervisor assigns Work ID to operator; operator works under this Work ID until re-assigned.
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {isBodyPrintStage && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1.5 shadow-2xs px-3 py-1.5"
                      onClick={() => setIsLaserPreviewOpen(true)}
                    >
                      <i className="ti ti-printer"></i>
                      <span>Meter Body Laser Preview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center gap-1.5 shadow-xs px-3 py-1.5"
                    onClick={handleOpenCreateForm}
                  >
                    <i className="ti ti-plus"></i>
                    <span>Create New Form / Work Order</span>
                  </button>
                </div>
              </div>

              <div className="card-body p-0">
                {formsLoading ? (
                  <SkeletonTable rows={4} columns={7} embedded />
                ) : stageForms.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="ti ti-clipboard-list fs-1 d-block mb-2 text-secondary opacity-50"></i>
                    <h6 className="fw-bold text-dark mb-1">No Work Forms Created for Stage #{viewingStage.stage_number}</h6>
                    <p className="small text-secondary mb-3">
                      Create multiple work forms for Stage #{viewingStage.stage_number}. Once created, {userRoleLabel} can assign Work IDs to operators.
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary fw-semibold"
                      onClick={handleOpenCreateForm}
                    >
                      <i className="ti ti-plus me-1"></i>Create First Work Form
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0 table-hover">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '50px' }} className="text-center">S.No</th>
                          <th style={{ minWidth: '150px' }}>Work ID / Form ID</th>
                          <th style={{ minWidth: '220px' }}>Form Title & Description</th>
                          <th style={{ minWidth: '140px' }}>Batch & Target</th>
                          <th style={{ minWidth: '180px' }}>Assign Status</th>
                          <th>Status</th>
                          <th className="text-end pe-3" style={{ minWidth: '160px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stageForms.map((form, fIdx) => (
                          <tr key={form.id || form.form_id || fIdx}>
                            <td className="text-center text-secondary small fw-bold">{fIdx + 1}</td>
                            <td>
                              <span className="badge bg-light text-primary border font-mono fs-6 px-2.5 py-1.5 d-inline-flex align-items-center gap-1 shadow-2xs">
                                <i className="ti ti-id-badge text-primary"></i>
                                {form.form_id}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{form.form_title}</div>
                              {form.description && (
                                <div className="text-secondary small text-truncate" style={{ maxWidth: '240px' }} title={form.description}>
                                  {form.description}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="small fw-semibold text-dark font-mono">{form.batch_no || 'BATCH-2026-01'}</div>
                              <div className="text-muted text-xs">Target: <strong>{form.target_quantity || 100}</strong> Meters</div>
                            </td>
                            <td>
                              {form.assigned_operator_id ? (
                                <div>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 font-sans d-inline-flex align-items-center gap-1">
                                    <i className="ti ti-check"></i>
                                    <span className="fw-semibold">Assigned (Stage #{viewingStage.stage_number})</span>
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
                                {isBodyPrintStage && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 px-2 py-1 font-sans ms-1"
                                    onClick={() => setIsLaserPreviewOpen(true)}
                                    title="View & Configure Meter Body Laser Print for this Work ID"
                                  >
                                    <i className="ti ti-printer text-primary"></i>
                                    <span>Preview</span>
                                  </button>
                                )}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end pt-3">
              <button type="button" className="btn btn-light px-4" onClick={() => setIsViewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Work Form Modal */}
      {viewingStage && (
        <Modal
          isOpen={isCreateFormOpen}
          onClose={() => setIsCreateFormOpen(false)}
          title={`Create Work Order for Stage #${viewingStage.stage_number}: ${viewingStage.stage_name}`}
          maxWidth={isBodyPrintStage ? 'min(1320px, 96vw)' : '580px'}
          bodyClassName={isBodyPrintStage ? 'p-0 overflow-hidden' : 'p-4 max-vh-75 overflow-auto'}
          bodyStyle={isBodyPrintStage ? { maxHeight: '88vh', height: '88vh' } : {}}
        >
          <form onSubmit={handleCreateForm} className="h-100 d-flex flex-column m-0">
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
                  <div className="p-3 rounded-3 border mb-1" style={{ backgroundColor: '#fafaf9', borderColor: '#e5e7eb' }}>
                    <div className="row g-3">
                      {/* Work ID / Form ID */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-flex align-items-center justify-content-between">
                          <span>Work ID / Form ID <span style={{ color: '#ea580c' }}>*</span></span>
                          <span className="badge font-mono" style={{ fontSize: '9.5px', backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>
                            Unique ID
                          </span>
                        </label>
                        <input
                          type="text"
                          className="form-control font-mono fw-bold"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff',
                            color: '#ea580c'
                          }}
                          value={newFormId}
                          onChange={(e) => setNewFormId(e.target.value)}
                          placeholder="e.g. WORK-STG9-001"
                          required
                        />
                      </div>

                      {/* Form / Work Title */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Form / Work Title <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={newFormTitle}
                          onChange={(e) => setNewFormTitle(e.target.value)}
                          placeholder="e.g. Meter Box Body Print Work Order"
                          required
                        />
                      </div>

                      {/* Production Batch No */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Production Batch No <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control font-mono"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={newBatchNo}
                          onChange={(e) => setNewBatchNo(e.target.value)}
                          placeholder="e.g. BATCH-2026-01"
                          required
                        />
                      </div>

                      {/* Target Quantity (Meters) */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Target Quantity (Meters) <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-control font-mono"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={newTargetQty}
                          onChange={(e) => setNewTargetQty(e.target.value)}
                          placeholder="500"
                          required
                        />
                      </div>

                      {/* Month and Year */}
                      {!isStage4 && (
                        <div className="col-md-6 col-12">
                          <label className="form-label fw-semibold text-dark small mb-1.5 d-block text-nowrap">
                            Month and Year
                          </label>
                          <input
                            type="text"
                            className="form-control font-mono"
                            style={{
                              height: '38px',
                              fontSize: '13px',
                              borderColor: '#d1d5db',
                              backgroundColor: '#ffffff'
                            }}
                            value={newMonthYear}
                            onChange={(e) => setNewMonthYear(e.target.value)}
                            placeholder="MM/YYYY"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                }
                leftBottomContent={
                  <div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark small mb-1">Process Instructions & Checklist</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Enter process checks, validation notes, and operator guidelines..."
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2">
                      <button className="btn text-white px-4 fw-semibold shadow-xs" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }} type="submit" disabled={formSubmitting}>
                        {formSubmitting ? 'Creating Work Form...' : 'Create Form & Work ID'}
                      </button>
                    </div>
                  </div>
                }
              />
            ) : (
              <div className="p-4">
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <label className="form-label fw-semibold text-dark small">Work ID / Form ID *</label>
                    <input
                      type="text"
                      className="form-control font-mono fw-bold text-primary"
                      value={newFormId}
                      onChange={(e) => setNewFormId(e.target.value)}
                      placeholder="e.g. WORK-STG1-001"
                      required
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label fw-semibold text-dark small">Form / Work Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newFormTitle}
                      onChange={(e) => setNewFormTitle(e.target.value)}
                      placeholder="e.g. Standard Assembly Work Order"
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small text-nowrap">Production Batch No *</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={newBatchNo}
                      onChange={(e) => setNewBatchNo(e.target.value)}
                      placeholder="e.g. BATCH-2026-01"
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small text-nowrap">Target Quantity (Meters) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={newTargetQty}
                      onChange={(e) => setNewTargetQty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {!isStage4 && (
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark small text-nowrap">Month and Year</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={newMonthYear}
                        onChange={(e) => setNewMonthYear(e.target.value)}
                        placeholder="MM/YYYY"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark small">Process Instructions & Checklist</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Enter process instructions..."
                  ></textarea>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-3 mt-2">
                  <button className="btn btn-light px-3 fw-semibold" type="button" onClick={() => setIsCreateFormOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary px-4 fw-semibold shadow-xs" type="submit" disabled={formSubmitting}>
                    {formSubmitting ? 'Creating Work Form...' : 'Create Form & Work ID'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Edit Work Order Modal (With Interactive Meter Body Canvas) */}
      {isEditFormOpen && editingForm && viewingStage && (
        <Modal
          isOpen={isEditFormOpen}
          onClose={() => setIsEditFormOpen(false)}
          title={`Edit Work Order: ${editFormId} (Stage #${viewingStage.stage_number}: ${viewingStage.stage_name})`}
          maxWidth={isBodyPrintStage ? 'min(1320px, 96vw)' : '580px'}
          bodyClassName={isBodyPrintStage ? 'p-0 overflow-hidden' : 'p-4 max-vh-75 overflow-auto'}
          bodyStyle={isBodyPrintStage ? { maxHeight: '88vh', height: '88vh' } : {}}
        >
          <form onSubmit={handleEditForm} className="h-100 d-flex flex-column m-0">
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
                  <div className="p-3 rounded-3 border mb-1" style={{ backgroundColor: '#fafaf9', borderColor: '#e5e7eb' }}>
                    <div className="row g-3">
                      {/* Work ID / Form ID */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-flex align-items-center justify-content-between">
                          <span>
                            Work ID / Form ID <span className="text-danger">*</span>
                          </span>
                          <span className="badge font-mono" style={{ fontSize: '9.5px', backgroundColor: '#e2e8f0', color: '#64748b' }}>
                            Read-Only
                          </span>
                        </label>
                        <input
                          type="text"
                          className="form-control font-mono fw-bold text-muted"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#f1f5f9'
                          }}
                          value={editFormId}
                          disabled
                          readOnly
                        />
                      </div>

                      {/* Form / Work Title */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Form / Work Title <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={editFormTitle}
                          onChange={(e) => setEditFormTitle(e.target.value)}
                          placeholder="e.g. Meter Box Body Print Work Order"
                          required
                        />
                      </div>

                      {/* Production Batch No */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Production Batch No <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control font-mono"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={editBatchNo}
                          onChange={(e) => setEditBatchNo(e.target.value)}
                          placeholder="e.g. BATCH-2026-01"
                          required
                        />
                      </div>

                      {/* Target Quantity (Meters) */}
                      <div className="col-md-6 col-12">
                        <label className="form-label fw-semibold text-dark small mb-1.5 d-block">
                          Target Quantity (Meters) <span style={{ color: '#ea580c' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-control font-mono"
                          style={{
                            height: '38px',
                            fontSize: '13px',
                            borderColor: '#d1d5db',
                            backgroundColor: '#ffffff'
                          }}
                          value={editTargetQty}
                          onChange={(e) => setEditTargetQty(e.target.value)}
                          placeholder="500"
                          required
                        />
                      </div>

                      {/* Month and Year */}
                      {!isStage4 && (
                        <div className="col-md-6 col-12">
                          <label className="form-label fw-semibold text-dark small mb-1.5 d-block text-nowrap">
                            Month and Year
                          </label>
                          <input
                            type="text"
                            className="form-control font-mono"
                            style={{
                              height: '38px',
                              fontSize: '13px',
                              borderColor: '#d1d5db',
                              backgroundColor: '#ffffff'
                            }}
                            value={editMonthYear}
                            onChange={(e) => setEditMonthYear(e.target.value)}
                            placeholder="MM/YYYY"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                }
                leftBottomContent={
                  <div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark small mb-1">Process Instructions & Checklist</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editFormDescription}
                        onChange={(e) => setEditFormDescription(e.target.value)}
                        placeholder="Enter process checks, validation notes, and operator guidelines..."
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2">
                      <button className="btn text-white px-4 fw-semibold shadow-xs" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }} type="submit" disabled={editFormSubmitting}>
                        {editFormSubmitting ? 'Saving Changes...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                }
              />
            ) : (
              <div className="p-4">
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <label className="form-label fw-semibold text-dark small">
                      Work ID / Form ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control font-mono fw-bold text-muted bg-light"
                      value={editFormId}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label fw-semibold text-dark small">Form / Work Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormTitle}
                      onChange={(e) => setEditFormTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small text-nowrap">Production Batch No *</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={editBatchNo}
                      onChange={(e) => setEditBatchNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small text-nowrap">Target Quantity (Meters) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={editTargetQty}
                      onChange={(e) => setEditTargetQty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {!isStage4 && (
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark small text-nowrap">Month and Year</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={editMonthYear}
                        onChange={(e) => setEditMonthYear(e.target.value)}
                        placeholder="MM/YYYY"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark small">Process Instructions & Checklist</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editFormDescription}
                    onChange={(e) => setEditFormDescription(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-3 mt-2">
                  <button className="btn btn-light px-3 fw-semibold" type="button" onClick={() => setIsEditFormOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary px-4 fw-semibold shadow-xs" type="submit" disabled={editFormSubmitting}>
                    {editFormSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}



      {/* Laser Body Print & Work ID Preview Modal */}
      {viewingStage && isBodyPrintStage && (
        <Modal
          isOpen={isLaserPreviewOpen}
          onClose={() => setIsLaserPreviewOpen(false)}
          title={`Stage #${viewingStage.stage_number}: ${viewingStage.stage_name} - Meter Body Print & Work ID Configurator`}
          size="xl"
        >
          <div className="p-2">
            <MeterBodyPrintConsole
              stageId={viewingStage.stage_number}
              stageTitle={viewingStage.stage_name}
              lineType={viewingStage.line_type}
              stationId={viewingStage.hardware_station}
              user={user}
            />
          </div>
        </Modal>
      )}

    </>
  );
}
