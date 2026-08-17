/**
 * Display formatting, shared so that a size or a date reads the same everywhere.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  // One decimal below 10 keeps "9.4 MB" informative without making "940 KB" noisy.
  return `${value < 10 && exponent > 0 ? value.toFixed(1) : Math.round(value)} ${UNITS[exponent]}`;
}

export function formatRelativeDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86_400, 'day'],
    [2_592_000, 'month'],
  ];

  for (const [divisor, unit] of thresholds) {
    const next = divisor === 60 ? 3600 : divisor * (unit === 'hour' ? 24 : 30);
    if (seconds < next) return formatter.format(-Math.round(seconds / divisor), unit);
  }

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
