import React, { lazy } from 'react';
const StagePage = lazy(() => import('./Stage04Page'));
const Stage04ValidateQrPage = lazy(() => import('./Stage04ValidateQrPage'));

export default [
  { path: 'stages/4/validate-qr', element: <Stage04ValidateQrPage /> },
  { path: 'stages/stage04-nic-inside-print/validate-qr', element: <Stage04ValidateQrPage /> },
  { path: 'stages/4', element: <StagePage /> },
  { path: 'stages/stage04-nic-inside-print', element: <StagePage /> }
];
