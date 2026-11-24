import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const StageSelectionPage = lazy(() => import('./StageSelectionPage'));
const StageExecutionDispatcher = lazy(() => import('./StageExecutionDispatcher'));

export const stagesCommonRoutes = [
  { path: 'select-stage', element: <StageSelectionPage /> },
  { path: 'stage-selection', element: <StageSelectionPage /> },
  { path: 'stages/execute', element: <StageExecutionDispatcher /> },
  { path: 'stages/:stageId', element: <StageExecutionDispatcher /> },
  { path: 'stages/:stageId/demo', element: <Navigate to="/dashboard" replace /> },
  { path: 'stages/4/demo', element: <Navigate to="/dashboard" replace /> },
  { path: 'demo-test', element: <Navigate to="/dashboard" replace /> }
];

export default stagesCommonRoutes;
