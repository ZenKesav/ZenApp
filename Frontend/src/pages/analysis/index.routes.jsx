import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const ProductionOverview = lazy(() => import('./production/ProductionOverview'));
const StageProductionDetailView = lazy(() => import('./production/StageProductionDetailView'));
const MeterTraceability = lazy(() => import('./production/MeterTraceability'));
const Reports = lazy(() => import('./reports/Reports'));

export const analysisRoutes = [
  // Dashboard & Analytics
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'analysis', element: <Dashboard /> },
  { path: 'analysis/dashboard', element: <Dashboard /> },

  // Production & Stage Production
  { path: 'stage-production', element: <ProductionOverview /> },
  { path: 'stage-production/details-view/:id', element: <StageProductionDetailView /> },
  { path: 'stage-production/view/:id', element: <StageProductionDetailView /> },
  { path: 'production', element: <ProductionOverview /> },
  { path: 'production/overview', element: <ProductionOverview /> },
  { path: 'production/traceability', element: <MeterTraceability /> },
  { path: 'inventory', element: <Navigate to="/stage-production" replace /> },

  // Reports
  { path: 'reports', element: <Reports /> }
];

export default analysisRoutes;
