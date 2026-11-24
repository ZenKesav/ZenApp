import React, { lazy } from 'react';

const QCTest = lazy(() => import('./QCTest'));
const QCInspectionPage = lazy(() => import('./QCInspectionPage'));
const HoldMetersPage = lazy(() => import('./HoldMetersPage'));
const RejectedMetersPage = lazy(() => import('./RejectedMetersPage'));
const QCReportsPage = lazy(() => import('./QCReportsPage'));

export const qcRoutes = [
  { path: 'qc', element: <QCInspectionPage /> },
  { path: 'qc/test', element: <QCTest /> },
  { path: 'qc-test', element: <QCTest /> },
  { path: 'qc/inspection', element: <QCInspectionPage /> },
  { path: 'qc/hold', element: <HoldMetersPage /> },
  { path: 'qc/rejected', element: <RejectedMetersPage /> },
  { path: 'qc/reports', element: <QCReportsPage /> }
];

export default qcRoutes;
