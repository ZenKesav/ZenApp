import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="auth-container min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Outlet />
    </div>
  );
}
