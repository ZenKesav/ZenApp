import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/store';
import { clearSavedStageForUser, isFullAccessUser, isSupervisorUser } from '../../../utils/stageUtils';
import { showSuccessAlert } from '../../../utils/swal';

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, toggleSidebar, toggleMobileSidebar, user, currentShift, logout, selectedStageId, setSelectedStageId } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const profileRef = useRef(null);

  const handleClearSavedStage = () => {
    setShowProfile(false);
    clearSavedStageForUser(user);
    showSuccessAlert(
      'Stage Cache Cleared',
      'Saved stage selection preference has been cleared. Next time you log in, the stage selection page will be shown.'
    );
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute Topbar Left Side Stage/Role Badge Label & Config
  const getStageBadgeConfig = () => {
    if (!user) return { label: 'Zenmeter', bgStyle: { backgroundColor: '#6c757d', color: '#ffffff' }, icon: 'ti-user' };

    const roleUpper = (user.role || '').toUpperCase();

    // 1. Admin / IT Admin -> "Admin(IT)"
    if (roleUpper === 'ADMIN' || roleUpper.includes('ADMIN')) {
      return { label: 'Admin(IT)', bgStyle: { backgroundColor: '#0f172a', color: '#ffffff' }, icon: 'ti-shield-lock' };
    }

    // 2. Supervisor -> "Supervisor"
    if (roleUpper === 'SUPERVISOR' || roleUpper.includes('SUPERVISOR')) {
      const pathMatch = location.pathname.match(/\/stages\/(?:stage0*|)(\d+)/i);
      const routeStage = pathMatch ? parseInt(pathMatch[1], 10) : null;
      if (routeStage) {
        return { label: `Supervisor (Stage ${routeStage})`, bgStyle: { backgroundColor: '#0284c7', color: '#ffffff' }, icon: 'ti-user-check' };
      }
      if (selectedStageId === 'all') {
        return { label: 'Supervisor (All Stages)', bgStyle: { backgroundColor: '#0284c7', color: '#ffffff' }, icon: 'ti-layout-grid' };
      }
      if (selectedStageId && selectedStageId !== 'all') {
        return { label: `Supervisor (Stage ${selectedStageId})`, bgStyle: { backgroundColor: '#0284c7', color: '#ffffff' }, icon: 'ti-user-check' };
      }
      return { label: 'Supervisor', bgStyle: { backgroundColor: '#0284c7', color: '#ffffff' }, icon: 'ti-user-check' };
    }

    // 3. QC Inspector -> "QC Inspector"
    if (roleUpper === 'QC' || roleUpper.includes('QC')) {
      return { label: 'QC Inspector', bgStyle: { backgroundColor: '#16a34a', color: '#ffffff' }, icon: 'ti-shield-check' };
    }

    // 4. Report Viewer -> "Report Viewer"
    if (roleUpper.includes('REPORT') || roleUpper.includes('VIEWER')) {
      return { label: 'Report Viewer', bgStyle: { backgroundColor: '#0891b2', color: '#ffffff' }, icon: 'ti-file-analytics' };
    }

    // 5. Stage Users / Operators (Show single active stage only, e.g. Operator (4-Stage), Operator (8-Stage), Operator (9-Stage))
    let activeStageNum = null;

    // A. Detect stage from current URL path first (e.g. /stages/4, /stages/8, /stages/9, /stages/stage08, etc.)
    const pathMatch = location.pathname.match(/\/stages\/(?:stage0*|)(\d+)/i);
    if (pathMatch) {
      activeStageNum = parseInt(pathMatch[1], 10);
    }

    // B. Detect from query parameter (e.g. ?stage=4)
    if (!activeStageNum && location.search) {
      const queryStage = new URLSearchParams(location.search).get('stage');
      if (queryStage && /^\d+$/.test(String(queryStage).trim())) {
        activeStageNum = parseInt(queryStage, 10);
      }
    }

    // C. Detect from selectedStageId in AuthContext if a single stage
    if (!activeStageNum && selectedStageId && selectedStageId !== 'all' && !String(selectedStageId).includes(',')) {
      const parsed = parseInt(String(selectedStageId).trim(), 10);
      if (!isNaN(parsed)) {
        activeStageNum = parsed;
      }
    }

    // D. Detect from session or local storage if a single stage
    if (!activeStageNum) {
      try {
        const saved = sessionStorage.getItem('zenmeter_selected_stage_id') || localStorage.getItem('zenmeter_selected_stage_id');
        if (saved && saved !== 'all' && !saved.includes(',')) {
          const parsed = parseInt(saved.trim(), 10);
          if (!isNaN(parsed)) {
            activeStageNum = parsed;
          }
        }
      } catch (e) { }
    }

    // E. Detect from user profile if assigned a single stage
    if (!activeStageNum && user?.stage_id && !String(user.stage_id).includes(',')) {
      const parsed = parseInt(String(user.stage_id).trim(), 10);
      if (!isNaN(parsed)) {
        activeStageNum = parsed;
      }
    }

    if (!activeStageNum && user?.assigned_stage && !String(user.assigned_stage).includes(',')) {
      const match = String(user.assigned_stage).match(/\d+/);
      if (match) {
        activeStageNum = parseInt(match[0], 10);
      }
    }

    // F. Fallback: if user has multiple assigned stages (e.g. "4, 8, 9, 10, ...") and on non-stage page, pick first stage only
    if (!activeStageNum && (user?.stage_id || user?.assigned_stage || user?.assigned_stages)) {
      const raw = String(user.stage_id || user.assigned_stage || (Array.isArray(user.assigned_stages) ? user.assigned_stages.join(',') : ''));
      const firstMatch = raw.match(/\d+/);
      if (firstMatch) {
        activeStageNum = parseInt(firstMatch[0], 10);
      }
    }

    if (activeStageNum) {
      return { label: `Operator (${activeStageNum}-Stage)`, bgStyle: { backgroundColor: '#ff5c00', color: '#ffffff' }, icon: 'ti-subtask' };
    }

    return { label: 'Operator', bgStyle: { backgroundColor: '#ff5c00', color: '#ffffff' }, icon: 'ti-subtask' };
  };

  const stageBadge = getStageBadgeConfig();
  const isAdmin = (user?.role || '').toUpperCase().includes('ADMIN');

  return (
    <nav
      id="topbar"
      className={`navbar fixed-top topbar px-3 ${isCollapsed ? 'full' : ''}`}
      style={{ marginLeft: 'unset' }}
    >
      {/* LEFT SIDE: TOGGLE BUTTONS & CURRENT STAGE/ROLE BADGE */}
      <div className="d-flex align-items-center gap-2">
        {/* DESKTOP TOGGLE BUTTON */}
        <button
          id="toggleBtn"
          className="d-none d-lg-inline-flex btn btn-light btn-icon btn-sm text-secondary"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className={`ti ${isCollapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'} fs-5`}></i>
        </button>

        {/* MOBILE TOGGLE BUTTON */}
        <button
          id="mobileBtn"
          className="btn btn-light btn-icon btn-sm d-lg-none me-1 text-secondary"
          onClick={toggleMobileSidebar}
          aria-label="Toggle Mobile Sidebar"
          title="Open Navigation Menu"
        >
          <i className="ti ti-menu-2 fs-5"></i>
        </button>

        {/* TOP BAR LEFT SIDE STAGE DISPLAY BADGE */}
        {user && (
          <div className="d-flex align-items-center gap-2 ms-1 ms-sm-2">
            <span
              className="topbar-stage-badge font-mono"
              style={stageBadge.bgStyle}
              title={`Logged in stage: ${stageBadge.label}`}
            >
              <i className={`ti ${stageBadge.icon} fs-6 flex-shrink-0`}></i>
              <span className="text-truncate">{stageBadge.label}</span>
            </span>
          </div>
        )}
      </div>

      {/* RIGHT SIDE: SHIFT NAME + USER NAME & EMP ID + USER ICON DROPDOWN */}
      <div className="d-flex align-items-center gap-2 gap-sm-3">

        {/* LOGGED IN USER NAME & EMP ID & SHIFT NAME */}
        <div className="d-none d-sm-flex flex-column text-end lh-tight">
          <span className="fw-bold text-dark small">{user?.name || user?.user_name || 'Zenmeter User'}</span>
          <small className="text-muted text-xs font-mono">
            {user?.employee_id ? `${user.employee_id} • ` : ''}{currentShift?.shift_name || (typeof currentShift === 'string' ? currentShift : 'General Shift')}
          </small>
        </div>

        {/* USER PROFILE AVATAR & DROPDOWN */}
        <div className="position-relative ms-1" ref={profileRef}>
          <button
            className="btn btn-link p-0 border-0 rounded-circle d-flex align-items-center gap-2 text-decoration-none shadow-xs"
            onClick={() => setShowProfile(prev => !prev)}
            aria-label="User profile"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
              alt={user?.name || user?.username || 'User'}
              className="avatar avatar-sm rounded-circle border border-2 border-primary"
              style={{ width: '38px', height: '38px', objectFit: 'cover' }}
            />
          </button>

          {/* USER FRIENDLY UI/UX PROFILE CARD */}
          {showProfile && (
            <div
              className="dropdown-menu dropdown-menu-end p-0 show position-absolute end-0 mt-2 topbar-profile-dropdown"
            >
              {/* Profile Card Header */}
              <div className="p-3 bg-primary text-white position-relative">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                    alt={user?.name || user?.username || 'User'}
                    className="avatar avatar-md rounded-circle border border-2 border-white shadow-sm"
                    style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                  />
                  <div>
                    <h6 className="mb-0 fw-bold text-white text-truncate" style={{ maxWidth: '170px' }}>
                      {user?.name || 'Zenmeter Operator'}
                    </h6>
                    <small className="opacity-90 font-mono text-xs d-block">
                      {user?.employee_id || 'EMP001'} &bull; {user?.role ? user.role.toUpperCase() : 'USER'}
                    </small>
                    <small className="opacity-75 text-xs text-truncate d-block" style={{ maxWidth: '170px' }}>
                      {user?.email || 'user@zenmeter.com'}
                    </small>
                  </div>
                </div>

                {/* Shift Pill inside profile header */}
                {currentShift && (
                  <div className="mt-2 pt-2 border-top border-white-20 d-flex justify-content-between align-items-center">
                    <small className="opacity-90 text-xs d-flex align-items-center gap-1.5">
                      <span className="pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: '#ffffff' }}></span>
                      Active Shift:
                    </small>
                    <span className="badge bg-white text-primary fw-bold font-mono text-xs shadow-xs">
                      <i className="ti ti-clock-play me-1"></i>{currentShift.shift_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Card Body Menu */}
              <div className="p-2 bg-white">
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `dropdown-item py-2 px-3 rounded-2 d-flex align-items-center gap-2 fw-medium ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setShowProfile(false)}
                >
                  <i className="ti ti-user-circle fs-5"></i>
                  <span>User Profile</span>
                </NavLink>

                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `dropdown-item py-2 px-3 rounded-2 d-flex align-items-center gap-2 fw-medium ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setShowProfile(false)}
                >
                  <i className="ti ti-home fs-5"></i>
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/users/login-history?scope=self"
                  className={({ isActive }) =>
                    `dropdown-item py-2 px-3 rounded-2 d-flex align-items-center gap-2 fw-medium ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setShowProfile(false)}
                >
                  <i className="ti ti-history fs-5"></i>
                  <span>Daily Login & Logout History</span>
                </NavLink>

                {isAdmin && (
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `dropdown-item py-2 px-3 rounded-2 d-flex align-items-center gap-2 fw-medium ${isActive ? 'active' : ''}`
                    }
                    onClick={() => setShowProfile(false)}
                  >
                    <i className="ti ti-settings fs-5"></i>
                    <span>System Settings</span>
                  </NavLink>
                )}

                {!isFullAccessUser(user) && !isSupervisorUser(user) && (
                  <button
                    type="button"
                    className="dropdown-item py-2 px-3 rounded-2 text-warning d-flex align-items-center gap-2 fw-medium border-0 bg-transparent w-100 text-start"
                    onClick={handleClearSavedStage}
                    title="Clear saved stage preference and view all assigned stage options"
                  >
                    <i className="ti ti-trash-x fs-5 text-warning"></i>
                    <span>Clear Saved Stage Cache</span>
                  </button>
                )}

                <div className="dropdown-divider my-2"></div>

                <button
                  type="button"
                  className="dropdown-item py-2 px-3 rounded-2 text-danger d-flex align-items-center gap-2 fw-bold"
                  onClick={() => {
                    setShowProfile(false);
                    logout();
                  }}
                >
                  <i className="ti ti-logout fs-5"></i>
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Topbar;
