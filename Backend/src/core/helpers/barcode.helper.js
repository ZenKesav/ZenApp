/**
 * Barcode & Scanner Parser Utility
 */
const parseBarcode = (input) => {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().replace(/[\r\n]+/g, '');

  // Detect Barcode Types
  // 1. DLMS QR format: SERIAL#BATCH#MODEL
  if (clean.includes('#')) {
    const parts = clean.split('#');
    return {
      type: 'DELIMITED_QR',
      raw: clean,
      serialNo: parts[0] || null,
      batchNo: parts[1] || null,
      model: parts[2] || null
    };
  }

  // 2. Standard 15-digit IMEI
  if (/^\d{15}$/.test(clean)) {
    return {
      type: 'IMEI',
      raw: clean,
      imei: clean
    };
  }

  // 3. PVC Seal Barcode
  if (/^PVC-\w+/i.test(clean) || /^SEAL-\w+/i.test(clean)) {
    return {
      type: 'PVC_SEAL',
      raw: clean,
      sealNo: clean
    };
  }

  // 4. Fallback raw serial / meter barcode
  return {
    type: 'SERIAL_NO',
    raw: clean,
    serialNo: clean
  };
};

module.exports = {
  parseBarcode
};
