import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';
import zenmeterLogo from '../../assets/images/zenmeter_logo.png';
import zenmeterBackgroungImages from '../../assets/images/zenmeter-solutions-pvt-ltd-electronic-city-phase-2-bangalore-digital-meter-manufacturers-Du3h8sS3fl.avif';
import officeImg from '../../assets/images/zenmeter_img.jpg';
import { getPostLoginRedirectPath } from '../../core/utils/stageUtils';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autofillLocked, setAutofillLocked] = useState({ identifier: true, password: true });

  const identifierInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const focusUnlockTimerRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(focusUnlockTimerRef.current).forEach(clearTimeout);
    };
  }, []);

  const getNoAutofillProps = (fieldKey) => ({
    name: `zen_no_autofill_${fieldKey}`,
    autoComplete: 'off',
    'aria-autocomplete': 'none',
    'data-lpignore': 'true',
    'data-form-type': 'other',
    readOnly: autofillLocked[fieldKey],
    style: { backgroundColor: '#ffffff' },
    onFocus: () => {
      clearTimeout(focusUnlockTimerRef.current[fieldKey]);
      focusUnlockTimerRef.current[fieldKey] = setTimeout(() => {
        setAutofillLocked((prev) => ({ ...prev, [fieldKey]: false }));
      }, 0);
    },
    onBlur: () => {
      clearTimeout(focusUnlockTimerRef.current[fieldKey]);
      setAutofillLocked((prev) => ({ ...prev, [fieldKey]: true }));
    }
  });

  useEffect(() => {
    if (!authLoading && user) {
      const targetPath = getPostLoginRedirectPath(user);
      navigate(targetPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="d-flex align-items-center gap-3 text-primary">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Checking session...</span>
          </div>
          <span className="fw-semibold small text-secondary">Checking session...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const idVal = (identifier || '').trim();
    if (!idVal) {
      setError('Please enter your Employee ID or Email Address.');
      identifierInputRef.current?.focus();
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await login(idVal, password);
      const targetPath = getPostLoginRedirectPath(res?.user || user);
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Invalid credentials or inactive account.');
      if (err.message && err.message.toLowerCase().includes('password')) {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifierKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.target.value || identifier || '').trim();
      if (!val) {
        setError('Please enter your Employee ID or Email Address.');
        identifierInputRef.current?.focus();
        return;
      }
      if (!password) {
        setError('');
        passwordInputRef.current?.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="position-relative min-vh-100 w-100 d-flex align-items-center justify-content-center p-3 p-sm-4 overflow-hidden m-0">
      <img
        src={zenmeterBackgroungImages}
        alt="Zenmeter Background"
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}
      />
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{
          backgroundColor: 'rgba(239, 244, 255, 0.35)',
          backdropFilter: 'blur(6px)',
          zIndex: 1,
        }}
      ></div>

      <div
        className="card shadow-lg border-0 overflow-hidden rounded-4 position-relative"
        style={{ maxWidth: '960px', width: '100%', zIndex: 2 }}
      >
        <div className="row g-0">
          <div className="col-lg-6 d-none d-lg-block position-relative bg-dark">
            <img
              src={officeImg}
              alt="Zenmeter Office Workspace"
              className="w-100 h-100 position-absolute top-0 start-0"
              style={{ objectFit: 'cover', opacity: 0.85 }}
            />
            <div
              className="position-relative h-100 d-flex flex-column justify-content-between p-5 text-white"
              style={{ background: 'linear-gradient(rgb(0 0 0 / 20%) 0%, rgb(0 0 0 / 70%) 100%)', zIndex: 2 }}
            >
              <div></div>
              <div>
                <blockquote className="fs-5 fw-medium mb-3 lh-base">
                  Streamline product inventory, track sales metrics, and empower your business operations seamlessly.
                </blockquote>
                <p className="small text-white-50 mb-0">Zenmeter - Redefining Metering Possibilities</p>
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-12 p-4 p-md-5 bg-white d-flex flex-column justify-content-center">
            <div className="mb-4 text-center">
              <NavLink to="/login" className="d-inline-flex align-items-center justify-content-center mb-3 text-decoration-none">
                <img src={zenmeterLogo} alt="Zenmeter Logo" style={{ height: '60px', width: 'auto' }} />
              </NavLink>
              <h1 className="h4 fw-bold mb-1 text-dark">Welcome Back</h1>
              <p className="text-secondary small mb-0">Sign in to manage your Zenmeter Portal</p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              {error && (
                <div className="alert alert-danger py-2 px-3 small text-center rounded-3 mb-3" role="alert">
                  <i className="ti ti-alert-circle me-1"></i> {error}
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="identifier" className="form-label fw-medium text-dark small">
                  Employee ID or Email Address
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="ti ti-user"></i>
                  </span>
                  <input
                    id="identifier"
                    ref={identifierInputRef}
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Enter Employee ID (e.g. EMP001) or Email"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={handleIdentifierKeyDown}
                    autoFocus
                    {...getNoAutofillProps('identifier')}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label d-flex justify-content-between fw-medium text-dark small">
                  <span>Password</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="ti ti-lock"></i>
                  </span>
                  <input
                    id="password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0 ps-0"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={handlePasswordKeyDown}
                    {...getNoAutofillProps('password')}
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-center mt-4">
                <button
                  className="btn btn-primary px-4 py-2.5 fw-semibold fs-6 shadow-sm w-100"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
