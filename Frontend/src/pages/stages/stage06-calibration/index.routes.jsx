import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage06Page'));

export default [
  { path: 'stages/6', element: <StagePage /> },
  { path: 'stages/stage06', element: <StagePage /> },
  { path: 'stages/stage06-calibration', element: <StagePage /> }
];
