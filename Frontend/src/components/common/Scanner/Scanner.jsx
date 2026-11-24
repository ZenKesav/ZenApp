import React from 'react';

export function Scanner({ value, onChange, placeholder = 'Scan or enter Barcode / QR Code...', className = '' }) {
  return (
    <div className={`input-group font-mono ${className}`}>
      <span className="input-group-text bg-light text-muted border-end-0 ps-3">
        <i className="ti ti-qrcode fs-5 text-primary"></i>
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-control border-start-0 rounded-end-3"
      />
    </div>
  );
}

export default Scanner;
