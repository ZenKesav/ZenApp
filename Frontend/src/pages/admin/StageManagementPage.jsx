import React, { useState, useEffect } from 'react';
import { stageManagementService } from '../../services/admin/admin.service';
import StageManagementTable from '../../components/admin/tables/StageManagementTable';
import CreateStageModal from '../../components/admin/modals/CreateStageModal';
import EditStageModal from '../../components/admin/modals/EditStageModal';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../core/utils/swal';

export default function StageManagementPage() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStages = () => {
    setLoading(true);
    stageManagementService.getStages().then(res => {
      const list = Array.isArray(res) ? res : (res?.stages || res?.data || []);
      setStages(Array.isArray(list) ? list : []);
      setLoading(false);
    }).catch(err => {
      console.error('loadStages error:', err);
      setStages([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleCreateStage = async (formData, resetForm) => {
    setSubmitting(true);
    try {
      const res = await stageManagementService.createStage(formData);
      showSuccessAlert('Stage Created', res?.message || 'New production stage added!');
      setIsCreateOpen(false);
      resetForm?.();
      loadStages();
    } catch (err) {
      showErrorAlert('Create Failed', err.message || 'Failed to create production stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (formData) => {
    if (!editingStage) return;
    setSubmitting(true);
    try {
      const res = await stageManagementService.updateStage(editingStage.id, formData);
      showSuccessAlert('Stage Updated', res?.message || 'Stage details saved!');
      setIsEditOpen(false);
      loadStages();
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStage = async (targetStage) => {
    if (!targetStage) return;
    const confirmed = await showConfirmAlert({
      title: 'Delete Stage?',
      text: `Are you sure you want to delete Stage #${targetStage.stage_number} (${targetStage.stage_name})?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await stageManagementService.deleteStage(targetStage.id);
      showSuccessAlert('Stage Deleted', res?.message || 'Production stage removed.');
      loadStages();
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete stage.');
    }
  };

  const nextStageNum = stages.length > 0 ? Math.max(...stages.map(s => Number(s.stage_number || 0))) + 1 : 1;

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-layout-grid text-primary"></i>
              <span>Production Stage Management</span>
            </h1>
          </div>
          <button
            className="btn btn-primary btn-sm fw-semibold shadow-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <i className="ti ti-plus me-1"></i> Add Production Stage
          </button>
        </div>
      </div>

      <StageManagementTable
        stages={stages}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        onEditStage={(s) => {
          setEditingStage(s);
          setIsEditOpen(true);
        }}
        onDeleteStage={handleDeleteStage}
      />

      <CreateStageModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateStage}
        submitting={submitting}
        nextStageNumber={nextStageNum}
      />

      <EditStageModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        stage={editingStage}
        onUpdate={handleUpdateStage}
        submitting={submitting}
      />
    </>
  );
}
