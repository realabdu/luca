/**
 * Formatting utilities for display values
 */

/**
 * Format a number for display with K/M suffixes
 * @example formatNumber(1234) // "1.23K"
 * @example formatNumber(1234567) // "1.23M"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

/**
 * Format a number as compact currency (no symbol)
 * @example formatCompactCurrency(1234) // "1.2K"
 */
export function formatCompactCurrency(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}

/**
 * Format a relative time string from a timestamp
 * @example getRelativeTime(Date.now() - 60000) // "1m ago"
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Parse a formatted value string back to a number
 * Handles K/M suffixes and percentage signs
 * @example parseValue("1.23K") // 1230
 * @example parseValue("45%") // 45
 */
export function parseValue(str: string): number {
  const cleanStr = str.replace('%', '');
  const num = parseFloat(cleanStr.replace(/[^0-9.-]/g, ''));
  if (str.includes('M')) return num * 1_000_000;
  if (str.includes('K')) return num * 1_000;
  return num;
}

/**
 * Format a percentage value
 * @example formatPercentage(0.1234) // "12.3%"
 */
export function formatPercentage(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Format a currency value with symbol
 * @example formatCurrency(1234.56, 'SAR') // "SAR 1,234.56"
 */
export function formatCurrency(value: number, currency = 'SAR'): string {
  return `${currency} ${value.toLocaleString()}`;
}
