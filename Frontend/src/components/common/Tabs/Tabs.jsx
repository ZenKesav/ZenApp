import React from 'react';

export function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <ul className="nav nav-tabs flex-nowrap border-bottom mb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li className="nav-item" key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className={`nav-link text-nowrap py-2.5 px-3.5 fw-semibold small ${
                  isActive ? 'active text-primary' : 'text-secondary'
                }`}
              >
                {tab.icon && <i className={`${tab.icon} me-1.5`}></i>}
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`badge ms-2 ${isActive ? 'bg-primary' : 'bg-secondary'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Tabs;
