import React from 'react';
import { NavLink } from 'react-router-dom';
export default function SidebarItem({ label, to }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({ display: 'block', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', backgroundColor: isActive ? '#0284c7' : 'transparent', color: isActive ? '#fff' : '#94a3b8' })}>
      {label}
    </NavLink>
  );
}
