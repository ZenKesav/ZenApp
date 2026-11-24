import React from 'react';
export default function DataTable({ headers = [], data = [] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
      <table style={{ width: '100%', textAlign: 'left', fontSize: '14px', color: '#cbd5e1', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', textTransform: 'uppercase', fontSize: '12px', color: '#94a3b8' }}>
          <tr>{headers.map((h, i) => <th key={i} style={{ padding: '12px' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
              {Object.values(row).map((val, j) => <td key={j} style={{ padding: '12px' }}>{val}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
