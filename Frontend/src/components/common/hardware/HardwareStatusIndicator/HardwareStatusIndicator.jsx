import React from 'react';
export default function HardwareStatusIndicator({ label, isConnected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '12px' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '9999px', backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
      <span>{label}</span>
    </div>
  );
}
