import React, { useState, useEffect } from 'react';
import { assignmentService, userService, stageManagementService } from '../../services/admin/admin.service';
import WorkOrderTable from '../../components/admin/tables/WorkOrderTable';
import WorkOrderModal from '../../components/admin/modals/WorkOrderModal';
import { showSuccessAlert, showErrorAlert } from '../../core/utils/swal';
import { PRODUCTION_STAGES } from '../../config/constants';

export default function AssignmentWorkOrderPage() {
  const [assignments, setAssignments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [stagesList, setStagesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      assignmentService.getAssignments(),
      userService.getUsers(),
      stageManagementService.getStages().catch(() => ({ stages: [] }))
    ]).then(([assignRes, userRes, stagesRes]) => {
      const aList = Array.isArray(assignRes) ? assignRes : (assignRes?.data || assignRes?.assignments || []);
      setAssignments(aList);
      const uList = Array.isArray(userRes) ? userRes : (userRes?.data || userRes?.users || []);
      const opers = uList.filter(u => (u.role || '').toUpperCase() === 'OPERATOR');
      setOperators(opers);

      const sList = Array.isArray(stagesRes) ? stagesRes : (stagesRes?.stages || stagesRes?.data || []);
      const activeStages = sList.filter(s => s.status === true || s.status === 'true' || s.status === 'ACTIVE' || s.status === 1 || s.status === '1');
      setStagesList(activeStages.length > 0 ? activeStages : PRODUCTION_STAGES);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await assignmentService.assignStage(formData);
      showSuccessAlert('Assigned', res?.message || 'Operator assigned to stage successfully!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to assign stage.');
      showErrorAlert('Assignment Failed', err.message || 'Failed to assign stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStageName = (stageId) => {
    const s = stagesList.find(st => Number(st.stage_number || st.id) === Number(stageId));
    return s ? `Stage #${s.stage_number || s.id}: ${s.stage_name || s.name}` : `Stage #${stageId}`;
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-clipboard-list text-primary"></i>
              <span>Stage & Station Assignments</span>
            </h1>
          </div>
          <button
            className="btn btn-primary btn-sm fw-medium shadow-sm"
            onClick={() => setIsModalOpen(true)}
            disabled={operators.length === 0}
          >
            <i className="ti ti-plus me-1"></i> Create New Assignment
          </button>
        </div>
      </div>

      <WorkOrderTable
        assignments={assignments}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        getStageName={getStageName}
      />

      <WorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        operators={operators}
        stages={stagesList}
        onAssign={handleAssign}
        submitting={submitting}
        error={error}
      />
    </>
  );
}
