import React from 'react';

// Standard Code 128 bar/space width patterns (indices 0..106, each 0..105 sums to 11 modules; 106 is Stop = 13 modules)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

function countLeadingDigits(str, startIndex) {
  let count = 0;
  while (startIndex + count < str.length) {
    const code = str.charCodeAt(startIndex + count);
    if (code < 48 || code > 57) break;
    count++;
  }
  return count;
}

function encodeCode128Auto(rawValue) {
  const text = String(rawValue || '').trim();
  if (!text) return null;

  const CODE_C = 99;
  const CODE_B = 100;
  const START_B = 104;
  const START_C = 105;
  const STOP = 106;

  const codes = [];
  let idx = 0;
  const initDigits = countLeadingDigits(text, 0);
  let mode = (initDigits >= 4 && initDigits % 2 === 0) || (initDigits === text.length && initDigits >= 2 && initDigits % 2 === 0) ? 'C' : 'B';
  codes.push(mode === 'C' ? START_C : START_B);

  while (idx < text.length) {
    if (mode === 'C') {
      const digitsAhead = countLeadingDigits(text, idx);
      if (digitsAhead >= 2) {
        codes.push(Number(text.slice(idx, idx + 2)));
        idx += 2;
      } else {
        codes.push(CODE_B);
        mode = 'B';
      }
    } else {
      const digitsAhead = countLeadingDigits(text, idx);
      if (digitsAhead >= 4) {
        if (digitsAhead % 2 === 1) {
          const charCode = text.charCodeAt(idx);
          codes.push(charCode - 32);
          idx += 1;
        }
        codes.push(CODE_C);
        mode = 'C';
      } else {
        const charCode = text.charCodeAt(idx);
        const symVal = charCode >= 32 && charCode <= 126 ? charCode - 32 : 13;
        codes.push(symVal);
        idx += 1;
      }
    }
  }

  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  const bars = [];
  let cursorX = 0;

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    for (let j = 0; j < pattern.length; j++) {
      const widthUnits = Number(pattern[j]);
      const isBar = j % 2 === 0;
      if (isBar) {
        bars.push({ x: cursorX, width: widthUnits });
      }
      cursorX += widthUnits;
    }
  }

  return { bars, totalModules: cursorX };
}

/**
 * Pure SVG Code 128B/C Auto 1D Barcode Generator
 * Crisp-edge high-contrast vector bars with optional label plate background.
 */
export default function BarcodeSVG({
  value = '',
  width = '100%',
  height = '100%',
  color = '#ffffff',
  bgColor = 'transparent',
  className = '',
  style = {}
}) {
  const encoded = encodeCode128Auto(value);
  if (!encoded) return null;

  const { bars, totalModules } = encoded;
  const hasSolidBg = Boolean(bgColor && bgColor !== 'transparent' && bgColor !== 'none');
  const quietZone = hasSolidBg ? 6 : 4;
  const viewWidth = totalModules + quietZone * 2;
  const viewHeight = 40;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
      style={{
        backgroundColor: hasSolidBg ? bgColor : 'transparent',
        borderRadius: hasSolidBg ? '2px' : '0',
        padding: hasSolidBg ? '2px 3px' : '0',
        display: 'block',
        ...style
      }}
    >
      {hasSolidBg && (
        <rect
          x={0}
          y={0}
          width={viewWidth}
          height={viewHeight}
          fill={bgColor}
          shapeRendering="crispEdges"
        />
      )}
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={quietZone + bar.x}
          y={0}
          width={bar.width}
          height={viewHeight}
          fill={color || '#ffffff'}
          shapeRendering="crispEdges"
        />
      ))}
    </svg>
  );
}

