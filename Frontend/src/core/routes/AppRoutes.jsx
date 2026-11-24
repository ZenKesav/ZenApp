import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';
import { getRegisteredRoutes } from './routeRegistry';

import LoginPage from '../../pages/auth/LoginPage';
import UnauthorizedPage from '../../pages/auth/UnauthorizedPage';
import NotFoundPage from '../../pages/auth/NotFoundPage';

const StageSelectionPage = lazy(() => import('../../pages/stages/StageSelectionPage'));

export default function AppRoutes() {
  const domainRoutes = getRegisteredRoutes();

  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}><span className="spinner-border spinner-border-sm me-2"></span>Loading module...</div>}>
      <Routes>
        {/* Auth & Standalone Layout Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/404-error" element={<NotFoundPage />} />
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Standalone Full-Screen Stage Selector (Matching old Frontend) */}
          <Route path="/select-stage" element={<StageSelectionPage />} />
          <Route path="/stage-selection" element={<StageSelectionPage />} />

          {/* Standard Main Layout Routes (With Sidebar & Topbar) */}
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            {domainRoutes.map((route, idx) => (
              <Route key={idx} path={route.path.replace(/^\//, '')} element={route.element} />
            ))}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
