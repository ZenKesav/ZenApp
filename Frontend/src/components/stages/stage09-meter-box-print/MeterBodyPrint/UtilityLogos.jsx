import React from 'react';
import zenmeterLogoImg from '../../../../assets/images/zenmeter_logo.png';

export const UTILITY_LOGO_OPTIONS = [
  { id: 'custom', name: 'Custom Upload / Utility Name', icon: 'ti-upload' }
];

export function RenderUtilityLogo({
  logoType = 'custom',
  customLogoUrl = null,
  customLogoText = '',
  className = '',
  style = {}
}) {
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="Custom Utility Logo"
        className={className}
        style={{ maxHeight: '38px', maxWidth: '140px', objectFit: 'contain', ...style }}
      />
    );
  }

  switch (logoType) {
    case 'bescom':
      return (
        <div className={`d-flex align-items-center gap-1.5 ${className}`} style={{ ...style }}>
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#fbbf24" strokeWidth="4" />
            <path d="M50 14 L30 52 L48 52 L42 86 L70 46 L52 46 Z" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
          </svg>
          <div className="text-start lh-1">
            <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.8px', color: '#0f172a', display: 'block' }}>
              BESCOM
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#475569', letterSpacing: '0.2px' }}>
              BENGALURU DISCOM
            </span>
          </div>
        </div>
      );

    case 'msedcl':
      return (
        <div className={`d-flex align-items-center gap-1.5 ${className}`} style={{ ...style }}>
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <rect x="10" y="10" width="80" height="80" rx="14" fill="#dc2626" />
            <circle cx="50" cy="50" r="28" fill="#ffffff" />
            <path d="M50 26 C42 36 38 46 44 58 C46 62 50 68 50 68 C50 68 54 62 56 58 C62 46 58 36 50 26 Z" fill="#dc2626" />
            <circle cx="50" cy="52" r="5" fill="#facc15" />
          </svg>
          <div className="text-start lh-1">
            <span style={{ fontSize: '12.5px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a', display: 'block' }}>
              MAHAVITARAN
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#475569' }}>
              MSEDCL &bull; MAHARASHTRA
            </span>
          </div>
        </div>
      );

    case 'tangedco':
      return (
        <div className={`d-flex align-items-center gap-1.5 ${className}`} style={{ ...style }}>
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" fill="#047857" stroke="#ffffff" strokeWidth="4" />
            <path d="M50 18 L64 36 L72 74 L28 74 L36 36 Z" fill="#ffffff" />
            <path d="M50 28 L42 50 L52 50 L46 70 L62 46 L52 46 Z" fill="#f59e0b" />
          </svg>
          <div className="text-start lh-1">
            <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a', display: 'block' }}>
              TANGEDCO
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#475569' }}>
              TAMIL NADU DISCOM
            </span>
          </div>
        </div>
      );

    case 'tatapower':
      return (
        <div className={`d-flex align-items-center gap-1.5 ${className}`} style={{ ...style }}>
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" fill="#0284c7" />
            <path d="M26 34 L74 34 M50 34 L50 72" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
            <path d="M68 62 A18 18 0 0 0 74 44" stroke="#f59e0b" strokeWidth="4" fill="none" />
          </svg>
          <div className="text-start lh-1">
            <span style={{ fontSize: '12.5px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a', display: 'block' }}>
              TATA POWER
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#475569' }}>
              LIGHTING UP LIVES
            </span>
          </div>
        </div>
      );

    case 'zensmart':
      return (
        <div className={`text-start ${className}`} style={{ ...style }}>
          <div className="d-flex align-items-center gap-1">
            <span style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a', fontStyle: 'italic' }}>
              ZenSmart
            </span>
            <sup style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff5c00' }}>®</sup>
          </div>
          <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#64748b', letterSpacing: '0.2px' }}>
            Next-Gen Cellular AMR/AMI
          </span>
        </div>
      );

    case 'zenmeter':
      return (
        <div className={`text-start ${className}`} style={{ ...style }}>
          <img
            src={zenmeterLogoImg}
            alt="ZenMeter"
            style={{ maxHeight: '28px', maxWidth: '130px', objectFit: 'contain', display: 'block' }}
          />
        </div>
      );

    case 'custom':
    default:
      return (
        <div className={`text-start ${className}`} style={{ ...style }}>
          <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px', color: '#0f172a', display: 'block' }}>
            {customLogoText || 'CUSTOM UTILITY'}
          </span>
          <span style={{ fontSize: '7.5px', fontWeight: '600', color: '#64748b' }}>
            POWER DISTRIBUTION UNIT
          </span>
        </div>
      );
  }
}
