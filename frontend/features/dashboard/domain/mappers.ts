/**
 * Dashboard DTO to Domain Mappers
 * Transforms snake_case API responses to camelCase domain types
 */

import type {
  DashboardData,
  Metric,
  PerformanceData,
  PlatformSpend,
  DailyMetrics,
} from './types';

// API DTOs (snake_case from Django)
interface MetricDto {
  id?: string;
  label: string;
  value: string;
  unit?: string;
  trend: number;
  trend_label: string;
  icon?: string;
  trend_type: 'up' | 'down' | 'neutral';
  color?: string;
  order?: number;
}

interface PerformanceDataDto {
  id?: string;
  date: string;
  revenue: number;
  spend: number;
}

interface PlatformSpendDto {
  id?: string;
  platform: string;
  percentage: number;
  spend?: number;
  color: string;
}

interface DailyMetricsDto {
  id?: string;
  date: string;
  revenue: number;
  orders_count: number;
  average_order_value: number;
  new_customers_count: number;
  total_spend: number;
  spend_by_platform: Record<string, number>;
  net_profit: number;
  roas: number;
  mer: number;
  net_margin: number;
  ncpa: number;
}

export interface DashboardDto {
  metrics: MetricDto[];
  performance?: PerformanceDataDto[];
  performanceData?: PerformanceDataDto[];
  platform_spend?: PlatformSpendDto[];
  platformSpend?: PlatformSpendDto[];
  daily_metrics?: DailyMetricsDto | null;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  lastSyncAt?: number;
  fromCache?: boolean;
  cacheAgeMinutes?: number;
}

function mapMetric(dto: MetricDto, index: number): Metric {
  return {
    id: dto.id || `metric-${index}`,
    label: dto.label,
    value: dto.value,
    unit: dto.unit,
    trend: dto.trend,
    trendLabel: dto.trend_label,
    icon: dto.icon || 'analytics',
    trendType: dto.trend_type,
    color: dto.color,
    order: dto.order ?? index,
  };
}

function mapPerformanceData(dto: PerformanceDataDto, index: number): PerformanceData {
  return {
    id: dto.id || `perf-${index}`,
    date: dto.date,
    revenue: dto.revenue,
    spend: dto.spend,
  };
}

function mapPlatformSpend(dto: PlatformSpendDto, index: number): PlatformSpend {
  return {
    id: dto.id || `platform-${index}`,
    platform: dto.platform,
    percentage: dto.percentage,
    spend: dto.spend ?? 0,
    color: dto.color,
  };
}

function mapDailyMetrics(dto: DailyMetricsDto): DailyMetrics {
  return {
    id: dto.id || 'daily-metrics',
    date: dto.date,
    revenue: dto.revenue,
    ordersCount: dto.orders_count,
    averageOrderValue: dto.average_order_value,
    newCustomersCount: dto.new_customers_count,
    totalSpend: dto.total_spend,
    spendByPlatform: dto.spend_by_platform,
    netProfit: dto.net_profit,
    roas: dto.roas,
    mer: dto.mer,
    netMargin: dto.net_margin,
    ncpa: dto.ncpa,
  };
}

export function mapDashboardDto(dto: DashboardDto): DashboardData {
  const performance = dto.performance || dto.performanceData || [];
  const platformSpend = dto.platform_spend || dto.platformSpend || [];

  return {
    metrics: dto.metrics.map(mapMetric),
    performance: performance.map(mapPerformanceData),
    platformSpend: platformSpend.map(mapPlatformSpend),
    dailyMetrics: dto.daily_metrics ? mapDailyMetrics(dto.daily_metrics) : null,
    dateRange: {
      startDate: dto.date_range?.start_date || new Date().toISOString(),
      endDate: dto.date_range?.end_date || new Date().toISOString(),
    },
    lastSyncAt: dto.lastSyncAt,
    fromCache: dto.fromCache,
    cacheAgeMinutes: dto.cacheAgeMinutes,
  };
}
