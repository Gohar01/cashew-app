/**
 * Date and Time formatters for Cashew Pro
 */

export function formatTransactionTime(createdAt?: number, timeStr?: string): string {
  if (timeStr) return timeStr;
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTransactionDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split(' ')[0].split('T')[0];
}
