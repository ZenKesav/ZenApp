import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage10Page'));

export default [
  { path: 'stages/10', element: <StagePage /> },
  { path: 'stages/stage10', element: <StagePage /> },
  { path: 'stages/stage10-carton-print', element: <StagePage /> }
];
