import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage08Page'));

export default [
  { path: 'stages/8', element: <StagePage /> },
  { path: 'stages/stage08', element: <StagePage /> },
  { path: 'stages/stage08-pvc-seal-tag', element: <StagePage /> }
];
