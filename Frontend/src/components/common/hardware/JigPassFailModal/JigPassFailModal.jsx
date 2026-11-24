import React from 'react';
export default function JigPassFailModal({ isOpen, isPass, onDismiss, message }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div style={{ padding: '48px', borderRadius: '24px', textAlign: 'center', border: `4px solid ${isPass ? '#22c55e' : '#ef4444'}`, backgroundColor: isPass ? '#052e16' : '#450a0a', color: '#fff' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, marginBottom: '16px' }}>{isPass ? 'PASS' : 'FAIL'}</div>
        <p style={{ fontSize: '20px', marginBottom: '24px' }}>{message}</p>
        <button onClick={onDismiss} style={{ padding: '12px 32px', borderRadius: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>DISMISS</button>
      </div>
    </div>
  );
}
