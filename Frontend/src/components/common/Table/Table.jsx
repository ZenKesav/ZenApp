import React from 'react';

export function Table({
  headers = [],
  data = [],
  renderRow,
  className = '',
  emptyMessage = 'No records found matching your criteria.'
}) {
  return (
    <div className="table-responsive">
      <div className="table-swipe-hint d-md-none">
        <i className="ti ti-arrows-left-right text-primary me-1"></i>
        <span>Swipe horizontally to view all columns</span>
      </div>
      <table className={`table table-hover align-middle mb-0 ${className}`}>
        <thead className="table-light">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((item, idx) => (renderRow ? renderRow(item, idx) : null))
          ) : (
            <tr>
              <td colSpan={headers.length || 1} className="text-center py-5 text-muted">
                <i className="ti ti-database-off fs-2 d-block mb-2 text-secondary opacity-50"></i>
                <span className="fw-semibold">{emptyMessage}</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
