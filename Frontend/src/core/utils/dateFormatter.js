export function formatShiftTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date(date));
}
