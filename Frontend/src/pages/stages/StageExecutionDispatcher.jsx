import React, { lazy, Suspense, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';
import { getUserAssignedStages, isFullAccessUser, saveStageForUser } from '../../utils/stageUtils';

const Stage01Page = lazy(() => import('./stage01-pcb-code-loading/Stage01Page'));
const Stage02Page = lazy(() => import('./stage02-nic-pcb-test/Stage02Page'));
const Stage04Page = lazy(() => import('./stage04-nic-inside-print/Stage04Page'));
const Stage06Page = lazy(() => import('./stage06-calibration/Stage06Page'));
const Stage07Page = lazy(() => import('./stage07-final-validation/Stage07Page'));
const Stage08Page = lazy(() => import('./stage08-pvc-seal-tag/Stage08Page'));
const Stage09Page = lazy(() => import('./stage09-meter-box-print/Stage09Page'));
const Stage10Page = lazy(() => import('./stage10-carton-print/Stage10Page'));
const Stage11Page = lazy(() => import('./stage11-master-carton/Stage11Page'));

export default function StageExecutionDispatcher() {
  const { stageId } = useParams();
  const { user, setSelectedStageId } = useAuth();

  if (!stageId) {
    return <Navigate to="/select-stage" replace />;
  }

  const normalized = String(stageId).trim().toLowerCase();
  const stageNumMatch = normalized.match(/(\d+)/);
  const requestedStageNum = stageNumMatch ? parseInt(stageNumMatch[1], 10) : null;

  const isFullAccess = isFullAccessUser(user);
  const assignedStages = getUserAssignedStages(user);
  const isAssigned = isFullAccess || assignedStages.some(s => Number(s.id || s.stage_number) === requestedStageNum);

  useEffect(() => {
    if (requestedStageNum && isAssigned) {
      saveStageForUser(user, requestedStageNum);
      if (setSelectedStageId) {
        setSelectedStageId(requestedStageNum);
      }
    }
  }, [requestedStageNum, isAssigned, user, setSelectedStageId]);

  // If operator tries to access an unassigned stage directly by URL
  if (!isAssigned && requestedStageNum) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="card border-0 shadow-sm p-4 p-md-5 mx-auto rounded-4" style={{ maxWidth: '580px', backgroundColor: '#ffffff' }}>
          <div className="mb-3">
            <i className="ti ti-shield-lock text-warning display-4"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">Stage Access Restricted</h4>
          <p className="text-muted small mb-3">
            Your user account (<strong>{user?.employee_id || user?.name}</strong>) is not assigned to <strong>Stage {requestedStageNum < 10 ? `0${requestedStageNum}` : requestedStageNum}</strong>.
          </p>
          <div className="alert alert-secondary small text-start py-2.5 px-3 rounded-3 mb-4 border-0" style={{ backgroundColor: '#f1f5f9' }}>
            <span className="fw-bold d-block mb-1.5 text-dark">Your Assigned Factory Stages:</span>
            {assignedStages.length > 0 ? (
              <div className="d-flex flex-wrap gap-1.5">
                {assignedStages.map(s => (
                  <span key={s.id} className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono">
                    Stage {s.id < 10 ? `0${s.id}` : s.id}: {s.name || s.shortName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted fst-italic">No stages currently assigned.</span>
            )}
          </div>
          <Link to="/select-stage" className="btn btn-primary btn-sm fw-semibold py-2 px-4 rounded-3 shadow-xs">
            <i className="ti ti-layout-grid me-1.5"></i> Choose from My Assigned Stages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-4 text-center text-muted"><span className="spinner-border spinner-border-sm me-2"></span>Loading Stage Module...</div>}>
      {(() => {
        switch (normalized) {
          case '1':
          case 'stage01':
          case 'stage01-pcb-code-loading':
            return <Stage01Page />;
          case '2':
          case 'stage02':
          case 'stage02-nic-pcb-test':
            return <Stage02Page />;
          case '4':
          case 'stage04':
          case 'stage04-nic-inside-print':
            return <Stage04Page />;
          case '6':
          case 'stage06':
          case 'stage06-calibration':
            return <Stage06Page />;
          case '7':
          case 'stage07':
          case 'stage07-final-validation':
            return <Stage07Page />;
          case '8':
          case 'stage08':
          case 'stage08-pvc-seal-tag':
            return <Stage08Page />;
          case '9':
          case 'stage09':
          case 'stage09-meter-box-print':
            return <Stage09Page />;
          case '10':
          case 'stage10':
          case 'stage10-carton-print':
            return <Stage10Page />;
          case '11':
          case 'stage11':
          case 'stage11-master-carton':
            return <Stage11Page />;
          default:
            return (
              <div className="container-fluid py-5 text-center">
                <div className="card border-0 shadow-sm p-4 mx-auto" style={{ maxWidth: '500px' }}>
                  <i className="ti ti-alert-triangle text-warning display-4 mb-2"></i>
                  <h5 className="fw-bold">Stage "{stageId}" Not Found</h5>
                  <p className="text-muted small">
                    The requested production stage ID is not configured or inactive.
                  </p>
                  <Link to="/select-stage" className="btn btn-primary btn-sm">
                    <i className="ti ti-arrow-left me-1"></i> Return to Stage Selection
                  </Link>
                </div>
              </div>
            );
        }
      })()}
    </Suspense>
  );
}
