import React from 'react';
import { Outlet } from 'react-router-dom';

export default function JigStationLayout() {
  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', padding: '8px', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
}
