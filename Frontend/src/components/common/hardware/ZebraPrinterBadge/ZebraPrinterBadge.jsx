import React from 'react';
export default function ZebraPrinterBadge({ isOnline }) {
  return <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: isOnline ? '#064e3b' : '#1e293b', color: isOnline ? '#6ee7b7' : '#94a3b8' }}>Zebra: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>;
}
