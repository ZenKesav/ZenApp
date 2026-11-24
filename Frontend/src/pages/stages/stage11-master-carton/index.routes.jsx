import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage11Page'));

export default [
  { path: 'stages/11', element: <StagePage /> },
  { path: 'stages/stage11', element: <StagePage /> },
  { path: 'stages/stage11-master-carton', element: <StagePage /> }
];
