import React, { useState, useEffect, useRef } from 'react';
import { shiftService } from '../../services/admin/admin.service';
import ShiftTable from '../../components/admin/tables/ShiftTable';
import CreateShiftModal from '../../components/admin/modals/CreateShiftModal';
import EditShiftModal from '../../components/admin/modals/EditShiftModal';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../core/utils/swal';

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const latestReqRef = useRef(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadShifts = (searchVal = searchTerm, sFilter = statusFilter) => {
    const reqId = ++latestReqRef.current;
    setLoading(true);
    const params = {};
    if (searchVal && searchVal.trim()) params.search = searchVal.trim();
    if (sFilter && sFilter.trim()) params.status = sFilter.trim();

    shiftService.getShifts(params).then(res => {
      if (reqId === latestReqRef.current) {
        const list = Array.isArray(res) ? res : (res?.shifts || res?.data || []);
        setShifts(Array.isArray(list) ? list : []);
        setLoading(false);
        setInitialLoading(false);
      }
    }).catch(err => {
      if (reqId === latestReqRef.current) {
        console.error('loadShifts error:', err);
        setShifts([]);
        setLoading(false);
        setInitialLoading(false);
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadShifts(searchTerm, statusFilter);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleCreateShift = async (formData, resetForm) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await shiftService.createShift(formData);
      showSuccessAlert('Shift Created', res?.message || 'New work shift schedule created!');
      setIsCreateOpen(false);
      resetForm?.();
      loadShifts();
    } catch (err) {
      setError(err.message || 'Failed to create shift.');
      showErrorAlert('Create Failed', err.message || 'Failed to create shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateShift = async (formData) => {
    if (!editingShift) return;
    setSubmitting(true);
    try {
      const res = await shiftService.updateShift(editingShift.id, formData);
      showSuccessAlert('Shift Updated', res?.message || 'Work shift updated successfully!');
      setIsEditOpen(false);
      loadShifts();
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (targetShift) => {
    if (!targetShift) return;
    const confirmed = await showConfirmAlert({
      title: 'Delete Shift?',
      text: `Are you sure you want to delete '${targetShift.shift_name}'?`,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await shiftService.deleteShift(targetShift.id);
      showSuccessAlert('Shift Deleted', res?.message || 'Shift deleted.');
      loadShifts();
    } catch (err) {
      showErrorAlert('Delete Failed', err.message || 'Failed to delete shift.');
    }
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fs-3 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-clock text-primary"></i>
              <span>Shift Management</span>
            </h1>
          </div>
          <button
            className="btn btn-primary btn-sm fw-semibold shadow-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <i className="ti ti-plus me-1"></i> Create New Shift
          </button>
        </div>
      </div>

      <ShiftTable
        shifts={shifts}
        loading={loading}
        initialLoading={initialLoading}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        onEditShift={(s) => {
          setEditingShift(s);
          setIsEditOpen(true);
        }}
        onDeleteShift={handleDeleteShift}
      />

      <CreateShiftModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateShift}
        submitting={submitting}
        error={error}
      />

      <EditShiftModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        shift={editingShift}
        onUpdate={handleUpdateShift}
        submitting={submitting}
      />
    </>
  );
}
