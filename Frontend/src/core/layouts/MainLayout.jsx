import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar';
import Sidebar from '../../components/common/Sidebar/Sidebar';
import Bottombar from '../../components/common/Bottombar/Bottombar';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const { isCollapsed, isMobileOpen, closeMobileSidebar } = useAuth();

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        closeMobileSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobileSidebar]);

  return (
    <div className="app-container min-vh-100 position-relative">
      <div
        id="overlay"
        className={`overlay ${isMobileOpen ? 'show' : ''}`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      ></div>

      <Topbar />
      <Sidebar />

      <main
        id="content"
        className={`content d-flex flex-column justify-content-between min-vh-100 ${isCollapsed ? 'full' : ''}`}
      >
        <div className="container-fluid px-2 px-sm-3 px-lg-4 flex-grow-1 pb-4">
          <Outlet />
        </div>
        <Bottombar />
      </main>
    </div>
  );
}
