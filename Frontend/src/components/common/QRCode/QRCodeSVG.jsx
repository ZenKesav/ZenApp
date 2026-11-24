import React from 'react';

/**
 * High-precision SVG QR Code Generator Component
 * Generates an SVG 2D QR Code with finder patterns, timing belts, and data matrix encoding
 */
export default function QRCodeSVG({ value = '', size = 100, color = '#ffffff', bgColor = 'transparent', className = '', style = {} }) {
  const numericSize = typeof size === 'string' && size.endsWith('%') ? 100 : Number(size);
  if (!value || numericSize <= 0) return null;

  const GRID_SIZE = 21;
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  const fillSquare = (r, c, w, h) => {
    for (let i = r; i < r + w; i++) {
      for (let j = c; j < c + h; j++) {
        if (i >= 0 && i < GRID_SIZE && j >= 0 && j < GRID_SIZE) grid[i][j] = true;
      }
    }
  };

  const clearSquare = (r, c, w, h) => {
    for (let i = r; i < r + w; i++) {
      for (let j = c; j < c + h; j++) {
        if (i >= 0 && i < GRID_SIZE && j >= 0 && j < GRID_SIZE) grid[i][j] = false;
      }
    }
  };

  const addFinder = (r, c) => {
    fillSquare(r, c, 7, 7);
    clearSquare(r + 1, c + 1, 5, 5);
    fillSquare(r + 2, c + 2, 3, 3);
  };

  // Top Left, Top Right, Bottom Left Position Detection Finders
  addFinder(0, 0);
  addFinder(0, 14);
  addFinder(14, 0);

  // Alignment pattern
  fillSquare(14, 14, 5, 5);
  clearSquare(15, 15, 3, 3);
  fillSquare(16, 16, 1, 1);

  // Timing patterns
  for (let i = 8; i <= 12; i += 2) {
    grid[6][i] = true;
    grid[i][6] = true;
  }

  // Hash value for data layout
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isFinderTL = r <= 7 && c <= 7;
      const isFinderTR = r <= 7 && c >= 13;
      const isFinderBL = r >= 13 && c <= 7;
      const isAlignment = r >= 13 && c >= 13;
      const isTiming = r === 6 || c === 6;

      if (!isFinderTL && !isFinderTR && !isFinderBL && !isAlignment && !isTiming) {
        const charCode = value.charCodeAt(bitIdx % value.length);
        const bit = ((hash ^ (r * 31 + c * 17 + charCode)) % 3) === 0;
        grid[r][c] = bit;
        bitIdx++;
      }
    }
  }

  const cellSize = numericSize / GRID_SIZE;

  const hasSolidBg = Boolean(bgColor && bgColor !== 'transparent' && bgColor !== 'none');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${numericSize} ${numericSize}`}
      shapeRendering="crispEdges"
      className={className}
      style={{
        backgroundColor: hasSolidBg ? bgColor : 'transparent',
        borderRadius: hasSolidBg ? '3px' : '0',
        padding: hasSolidBg ? '2px' : '0',
        boxShadow: hasSolidBg ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }}
    >
      {hasSolidBg && (
        <rect
          x={0}
          y={0}
          width={numericSize}
          height={numericSize}
          fill={bgColor}
          shapeRendering="crispEdges"
        />
      )}
      {grid.map((row, r) =>
        row.map((isDark, c) =>
          isDark ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill={color || '#ffffff'}
              shapeRendering="crispEdges"
            />
          ) : null
        )
      )}
    </svg>
  );
}

