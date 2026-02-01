/**
 * Date utilities for date range selection and formatting
 */

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7Days'
  | 'last30Days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DatePreset;
  compareEnabled: boolean;
  compareStartDate?: Date;
  compareEndDate?: Date;
}

/**
 * Get start and end dates from a preset
 */
export function getDateRangeFromPreset(preset: DatePreset): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: endOfToday };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return { startDate: yesterday, endDate: endOfYesterday };
    }

    case 'last7Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: endOfToday };
    }

    case 'last30Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: endOfToday };
    }

    case 'thisWeek': {
      const start = new Date(today);
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = start of week
      start.setDate(start.getDate() - diff);
      return { startDate: start, endDate: endOfToday };
    }

    case 'lastWeek': {
      const start = new Date(today);
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diff - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start, endDate: endOfToday };
    }

    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'thisQuarter': {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), quarterStart, 1);
      return { startDate: start, endDate: endOfToday };
    }

    case 'lastQuarter': {
      const currentQuarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), currentQuarterStart - 3, 1);
      const end = new Date(today.getFullYear(), currentQuarterStart, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: start, endDate: endOfToday };
    }

    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    default:
      return { startDate: today, endDate: endOfToday };
  }
}

/**
 * Calculate comparison range for a given date range
 * Uses "previous period" comparison by default
 */
export function getComparisonRange(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  const compareEnd = new Date(startDate);
  compareEnd.setDate(compareEnd.getDate() - 1);
  compareEnd.setHours(23, 59, 59, 999);

  const compareStart = new Date(compareEnd);
  compareStart.setDate(compareStart.getDate() - durationDays + 1);
  compareStart.setHours(0, 0, 0, 0);

  return { startDate: compareStart, endDate: compareEnd };
}

/**
 * Format a date in short format
 * @example formatDateShort(new Date()) // "Jan 15"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date range as a string
 * @example formatDateRange(start, end) // "Jan 15 - Jan 21"
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

/**
 * Get the default date range (last 7 days)
 */
export function getDefaultDateRange(): DateRange {
  const { startDate, endDate } = getDateRangeFromPreset('last7Days');
  return {
    startDate,
    endDate,
    preset: 'last7Days',
    compareEnabled: false,
  };
}

/**
 * Check if two date ranges are equal
 */
export function areDateRangesEqual(a: DateRange, b: DateRange): boolean {
  return (
    a.startDate.getTime() === b.startDate.getTime() &&
    a.endDate.getTime() === b.endDate.getTime() &&
    a.preset === b.preset &&
    a.compareEnabled === b.compareEnabled
  );
}
