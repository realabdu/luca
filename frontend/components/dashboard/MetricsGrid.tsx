'use client';

import { MetricCard, MetricCardSkeleton } from './MetricCard';

interface DashboardMetric {
  label: string;
  value: string;
  unit?: string;
  trend: number;
  trendLabel: string;
  trendType: 'up' | 'down' | 'neutral';
  color?: string;
  isPinned?: boolean;
  sparklineData?: { value: number }[];
  platforms?: ('salla' | 'shopify' | 'meta' | 'google' | 'tiktok' | 'snapchat')[];
}

interface MetricsGridProps {
  pins: DashboardMetric[];
  customMetrics: DashboardMetric[];
  isLoading: boolean;
}

export function MetricsGrid({ pins, customMetrics, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <>
        {/* Primary Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton size="hero" className="lg:col-span-1" />
        </div>

        {/* Secondary Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Primary Metrics - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pins[0] && <MetricCard {...pins[0]} />}
        {pins[1] && <MetricCard {...pins[1]} />}
        {pins[2] && <MetricCard {...pins[2]} size="hero" className="lg:col-span-1" />}
      </div>

      {/* Secondary Metrics - 4 column grid */}
      {customMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {customMetrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} showSparkline={false} />
          ))}
        </div>
      )}
    </>
  );
}
