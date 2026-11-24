export function buildCartonZpl({ cartonNo, meterCount, grossWeight }) {
  return `^XA^FO50,50^ADN,36,20^FDZenmeter Carton: ${cartonNo}^FS^FO50,100^FDQty: ${meterCount}^FS^FO50,150^FDWeight: ${grossWeight}kg^FS^XZ`;
}
