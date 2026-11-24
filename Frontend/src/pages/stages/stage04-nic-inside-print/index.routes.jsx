import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage04Page'));

export default [
  { path: 'stages/4', element: <StagePage /> },
  { path: 'stages/stage04-nic-inside-print', element: <StagePage /> }
];
