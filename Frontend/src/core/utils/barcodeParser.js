export function cleanBarcode(raw) {
  if (!raw) return '';
  return String(raw).replace(/[\r\n]/g, '').trim();
}
