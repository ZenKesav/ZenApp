import React, { lazy } from 'react';

const SupervisorTest = lazy(() => import('./SupervisorTest'));
const StageOverridePage = lazy(() => import('./StageOverridePage'));
const AuditTrailPage = lazy(() => import('./AuditTrailPage'));

export const supervisorRoutes = [
  { path: 'supervisor', element: <SupervisorTest /> },
  { path: 'supervisor/test', element: <SupervisorTest /> },
  { path: 'supervisor-test', element: <SupervisorTest /> },
  { path: 'supervisor/override', element: <StageOverridePage /> },
  { path: 'supervisor/audit', element: <AuditTrailPage /> }
];

export default supervisorRoutes;
