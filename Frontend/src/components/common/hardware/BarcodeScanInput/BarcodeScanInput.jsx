import React from 'react';
export default function BarcodeScanInput({ value, onChange, placeholder = 'Scan Barcode...' }) {
  return (
    <input
      type="text"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '18px', fontFamily: 'monospace' }}
    />
  );
}
