import React from 'react';
export default function WeightDisplayWidget({ weight = 0 }) {
  return (
    <div style={{ backgroundColor: '#000', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', textAlign: 'center', fontFamily: 'monospace' }}>
      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Gross Weight</div>
      <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fbbf24' }}>{Number(weight).toFixed(3)} <span style={{ fontSize: '24px', color: '#94a3b8' }}>kg</span></div>
    </div>
  );
}
