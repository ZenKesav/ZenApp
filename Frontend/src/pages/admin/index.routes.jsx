import React, { lazy } from 'react';

const UserList = lazy(() => import('./users/UserList'));
const RoleManagement = lazy(() => import('./roles/RoleManagement'));
const ShiftManagement = lazy(() => import('./shifts/ShiftManagement'));
const StageManagement = lazy(() => import('./StageManagement'));
const StageView = lazy(() => import('./StageView'));
const StageEdit = lazy(() => import('./StageEdit'));
const Settings = lazy(() => import('./settings/Settings'));
const UserProfile = lazy(() => import('./users/UserProfile'));
const LoginHistory = lazy(() => import('./users/LoginHistory'));
const UserView = lazy(() => import('./users/UserView'));

export default [
  // Admin module canonical routes
  { path: 'admin/users', element: <UserList /> },
  { path: 'admin/roles', element: <RoleManagement /> },
  { path: 'admin/shifts', element: <ShiftManagement /> },
  { path: 'admin/stages', element: <StageManagement /> },
  { path: 'admin/settings', element: <Settings /> },

  // User and Admin routes
  { path: 'users', element: <UserList /> },
  { path: 'users/view/:id', element: <UserView /> },
  { path: 'users/login-history', element: <LoginHistory /> },
  { path: 'login-history', element: <LoginHistory /> },
  { path: 'roles', element: <RoleManagement /> },
  { path: 'shifts', element: <ShiftManagement /> },
  { path: 'stage-management', element: <StageManagement /> },
  { path: 'stage-management/view/:stageId', element: <StageView /> },
  { path: 'stage-management/edit/:stageId', element: <StageEdit /> },
  { path: 'settings', element: <Settings /> },
  { path: 'profile', element: <UserProfile /> },
  { path: 'user-profile', element: <UserProfile /> },
  { path: 'docs', element: <Settings /> }
];
