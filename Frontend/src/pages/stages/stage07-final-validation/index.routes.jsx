import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage07Page'));

export default [
  { path: 'stages/7', element: <StagePage /> },
  { path: 'stages/stage07', element: <StagePage /> },
  { path: 'stages/stage07-final-validation', element: <StagePage /> }
];
