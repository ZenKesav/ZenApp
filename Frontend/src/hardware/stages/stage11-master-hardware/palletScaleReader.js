export function parseWeightStream(dataString) {
  const match = dataString.match(/(\d+\.\d+)/);
  return match ? parseFloat(match[1]) : 0.0;
}
