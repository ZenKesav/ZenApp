import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../app/store';
import { stageManagementService } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/CommonComponents';
import { showSuccessAlert, showErrorAlert } from '../../utils/swal';

export default function StageEdit() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserEmail = user?.email || user?.employee_id || 'admin@zenmeter.com';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stages, setStages] = useState([]);
  const [stage, setStage] = useState(null);

  // Form Fields
  const [stageNumber, setStageNumber] = useState(1);
  const [stageName, setStageName] = useState('');
  const [description, setDescription] = useState('');
  const [hardwareStation, setHardwareStation] = useState('');
  const [lineType, setLineType] = useState('Main Meter Assembly Line');
  const [status, setStatus] = useState(true);

  const initialRef = useRef({});

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
    loadStageData();
  }, [stageId]);

  const loadStageData = async () => {
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
      const num = found.stage_number || 1;
      const nameStr = found.stage_name || '';
      const descStr = found.description || '';
      const hwStr = found.hardware_station || `Station-${String(num).padStart(2, '0')}`;
      const lType = found.line_type || 'Main Meter Assembly Line';
      const isActive =
        found.status === true ||
        found.status === 'true' ||
        found.status === 'ACTIVE' ||
        found.status === 1 ||
        found.status === '1';

      setStageNumber(num);
      setStageName(nameStr);
      setDescription(descStr);
      setHardwareStation(hwStr);
      setLineType(lType);
      setStatus(isActive);

      initialRef.current = {
        stageNumber: Number(num),
        stageName: nameStr.trim(),
        description: descStr.trim(),
        hardwareStation: hwStr.trim(),
        lineType: lType,
        status: isActive
      };
    } catch (err) {
      console.error('Failed to load stage:', err);
      showErrorAlert('Error', err.message || 'Failed to load stage information.');
    } finally {
      setLoading(false);
    }
  };

  const conflictingStage =
    stage && stageNumber && Number(stageNumber) !== Number(stage.stage_number)
      ? stages.find((s) => Number(s.stage_number) === Number(stageNumber) && s.id !== stage.id)
      : null;

  const isModified =
    stage &&
    initialRef.current &&
    (Number(stageNumber) !== initialRef.current.stageNumber ||
      stageName.trim() !== initialRef.current.stageName ||
      description.trim() !== initialRef.current.description ||
      hardwareStation.trim() !== initialRef.current.hardwareStation ||
      lineType !== initialRef.current.lineType ||
      status !== initialRef.current.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stage) return;
    if (conflictingStage) {
      showErrorAlert('Stage Number Conflict', `Stage #${stageNumber} is already used by '${conflictingStage.stage_name}'.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await stageManagementService.updateStage(stage.id, {
        stage_number: Number(stageNumber),
        stage_name: stageName.trim(),
        description: description.trim(),
        line_type: lineType,
        hardware_station: hardwareStation.trim() || `Station-${String(stageNumber).padStart(2, '0')}`,
        status: status,
        updated_by: currentUserEmail
      });

      showSuccessAlert(
        'Stage Updated',
        res.message || `Production Stage #${stageNumber} '${stageName}' updated successfully!`
      );
      navigate(`/stage-management/view/${stageNumber}`);
    } catch (err) {
      showErrorAlert('Update Failed', err.message || 'Failed to update stage.');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="container-fluid py-2">
      {/* Breadcrumb & Navigation */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/stage-management" className="text-decoration-none text-muted">
                <i className="ti ti-subtask me-1"></i>Stage Management
              </Link>
            </li>
            <li className="breadcrumb-item">
              <Link to={`/stage-management/view/${stage.stage_number}`} className="text-decoration-none text-muted">
                Stage #{stage.stage_number}
              </Link>
            </li>
            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
              Edit Stage
            </li>
          </ol>
        </nav>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1.5"
            onClick={() => navigate('/stage-management')}
          >
            <i className="ti ti-arrow-left"></i>
            <span>Back to Stage Management</span>
          </button>
          <Link
            to={`/stage-management/view/${stage.stage_number}`}
            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5"
          >
            <i className="ti ti-eye"></i>
            <span>View Stage</span>
          </Link>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center shadow-xs"
              style={{ width: '56px', height: '56px' }}
            >
              <i className="ti ti-edit fs-2"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <span className="badge bg-primary text-white font-mono px-2.5 py-1">
                  Stage #{stage.stage_number}
                </span>
                <span
                  className={`badge px-2.5 py-1 ${
                    status
                      ? 'bg-success-subtle text-success border border-success'
                      : 'bg-secondary-subtle text-secondary border'
                  }`}
                >
                  <i className={`ti ${status ? 'ti-circle-check' : 'ti-circle-x'} me-1`}></i>
                  {status ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="mb-0 fw-bold text-dark">Edit Stage: {stage.stage_name}</h3>
              <p className="text-muted small mb-0 mt-0.5">
                Update production stage parameters, station assignment, line association, and operational status.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content Grid */}
      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Left Column: Stage Parameters */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-adjustments-horizontal text-primary"></i>
                  <span>Stage Configuration</span>
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark small">
                      Stage Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={`form-control ${conflictingStage ? 'is-invalid' : ''}`}
                      value={stageNumber}
                      onChange={(e) => setStageNumber(e.target.value)}
                      required
                    />
                    {conflictingStage ? (
                      <div className="invalid-feedback text-xs">
                        Stage #{stageNumber} conflicts with "{conflictingStage.stage_name}".
                      </div>
                    ) : (
                      <small className="text-muted text-xs">Unique sequential stage number in line</small>
                    )}
                  </div>

                  <div className="col-md-8">
                    <label className="form-label fw-semibold text-dark small">
                      Stage Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      placeholder="e.g. Meter Box Body Print"
                      required
                    />
                    <small className="text-muted text-xs">Descriptive title of the assembly or test step</small>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small">
                      Hardware Station <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="ti ti-cpu"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        value={hardwareStation}
                        onChange={(e) => setHardwareStation(e.target.value)}
                        placeholder="e.g. Station-09"
                        required
                      />
                    </div>
                    <small className="text-muted text-xs">Physical station or bench ID on shop floor</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark small">
                      Line Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={lineType}
                      onChange={(e) => setLineType(e.target.value)}
                    >
                      <option value="Main Meter Assembly Line">Main Meter Assembly Line</option>
                      <option value="NIC Line">NIC Line</option>
                      <option value="Packaging Line">Packaging Line</option>
                      <option value="Sub-Assembly Line">Sub-Assembly Line</option>
                      <option value="Testing Line">Testing Line</option>
                      <option value="Inspection Line">Inspection Line</option>
                    </select>
                    <small className="text-muted text-xs">Designated manufacturing line</small>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark small">
                    Description & Responsibilities
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the processes performed at this stage, components assembled, tests executed..."
                  />
                  <small className="text-muted text-xs">
                    Clear guidance shown to operators and supervisors
                  </small>
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="form-check form-switch d-flex align-items-center gap-3 m-0">
                    <input
                      className="form-check-input fs-5 m-0"
                      type="checkbox"
                      role="switch"
                      id="stageStatusSwitch"
                      checked={status}
                      onChange={(e) => setStatus(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <label
                        className="form-check-label fw-bold text-dark d-block mb-0"
                        htmlFor="stageStatusSwitch"
                        style={{ cursor: 'pointer' }}
                      >
                        {status ? 'Active Stage' : 'Inactive / Suspended Stage'}
                      </label>
                      <span className="text-muted text-xs">
                        {status
                          ? 'This stage is fully operational and visible in production lines and operator consoles.'
                          : 'This stage is disabled and cannot accept new work orders until activated.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons Footer */}
              <div className="card-footer bg-white py-3 px-4 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={() => navigate('/stage-management')}
                >
                  <i className="ti ti-x me-1"></i>Cancel
                </button>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-semibold shadow-xs d-inline-flex align-items-center gap-2"
                    disabled={submitting || !isModified || !!conflictingStage}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy"></i>
                        <span>Save Stage Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stage Audit & Quick Summary */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-info-circle text-primary"></i>
                  <span>Stage Audit & Metadata</span>
                </h6>
              </div>
              <div className="card-body p-3">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">System Database ID:</span>
                    <span className="font-mono fw-bold text-dark">{stage.id}</span>
                  </li>
                  <li className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Created At:</span>
                    <span className="text-dark small fw-medium">{formatDateTimeDDMMYYYY(stage.created_at)}</span>
                  </li>
                  <li className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Created By:</span>
                    <span className="text-dark small text-truncate" style={{ maxWidth: '180px' }} title={stage.created_by || 'Admin'}>
                      {stage.created_by || 'Admin'}
                    </span>
                  </li>
                  <li className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Last Updated:</span>
                    <span className="text-dark small fw-medium">{formatDateTimeDDMMYYYY(stage.updated_at)}</span>
                  </li>
                  <li className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Updated By:</span>
                    <span className="text-dark small text-truncate" style={{ maxWidth: '180px' }} title={stage.updated_by || '-'}>
                      {stage.updated_by || '-'}
                    </span>
                  </li>
                </ul>

                <div className="mt-3 pt-3 border-top">
                  <Link
                    to={`/stage-management/view/${stage.stage_number}`}
                    className="btn btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-2"
                  >
                    <i className="ti ti-file-text"></i>
                    <span>Manage Work Orders & View Details</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

