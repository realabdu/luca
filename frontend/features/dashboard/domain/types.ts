/**
 * Dashboard Domain Types
 * These are the frontend-friendly types (camelCase)
 */

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  trend: number;
  trendLabel: string;
  icon: string;
  trendType: 'up' | 'down' | 'neutral';
  color?: string;
  order: number;
}

export interface PerformanceData {
  id: string;
  date: string;
  revenue: number;
  spend: number;
}

export interface PlatformSpend {
  id: string;
  platform: string;
  percentage: number;
  spend: number;
  color: string;
}

export interface DailyMetrics {
  id: string;
  date: string;
  revenue: number;
  ordersCount: number;
  averageOrderValue: number;
  newCustomersCount: number;
  totalSpend: number;
  spendByPlatform: Record<string, number>;
  netProfit: number;
  roas: number;
  mer: number;
  netMargin: number;
  ncpa: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DashboardData {
  metrics: Metric[];
  performance: PerformanceData[];
  platformSpend: PlatformSpend[];
  dailyMetrics: DailyMetrics | null;
  dateRange: DateRange;
  lastSyncAt?: number;
  fromCache?: boolean;
  cacheAgeMinutes?: number;
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  compareEnabled?: boolean;
  compareStartDate?: string;
  compareEndDate?: string;
  live?: boolean;
}
