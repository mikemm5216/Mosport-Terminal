export function formatLocalTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "??:??";

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  // Calculate offset in hours
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  const gmtSign = offsetHours >= 0 ? '+' : '-';
  const gmtString = `GMT${gmtSign}${Math.abs(offsetHours)}`;

  return `${hours}:${minutes} [${gmtString}]`;
}
