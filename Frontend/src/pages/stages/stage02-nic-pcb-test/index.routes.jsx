import React, { lazy } from 'react';

const Stage02Page = lazy(() => import('./Stage02Page'));
const Stage02HistoryPage = lazy(() => import('./Stage02HistoryPage'));
const Stage02RfCalibrationPage = lazy(() => import('./Stage02RfCalibrationPage'));

export const stage02Routes = [
  { path: 'stages/stage02', element: <Stage02Page /> },
  { path: 'stages/2', element: <Stage02Page /> },
  { path: 'stages/stage02-nic-pcb-test', element: <Stage02Page /> },
  // Isolated sub-pages added by Stage 2 team without touching global routes:
  { path: 'stages/2/history', element: <Stage02HistoryPage /> },
  { path: 'stages/stage02/history', element: <Stage02HistoryPage /> },
  { path: 'stages/2/calibration', element: <Stage02RfCalibrationPage /> },
  { path: 'stages/stage02/calibration', element: <Stage02RfCalibrationPage /> }
];

export default stage02Routes;
