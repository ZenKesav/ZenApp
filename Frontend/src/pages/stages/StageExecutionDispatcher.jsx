import React, { lazy, Suspense } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';

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

  if (!stageId) {
    return <Navigate to="/select-stage" replace />;
  }

  const normalized = String(stageId).trim().toLowerCase();

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
