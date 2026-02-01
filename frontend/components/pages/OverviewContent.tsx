'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { PageLoading, NoOrganization } from '@/components/ui';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { MetricCardSkeleton } from '@/components/dashboard/MetricCard';
import EmptyDashboard from '@/components/dashboard/EmptyDashboard';
import { getDefaultDateRange, type DateRange } from '@/components/dashboard/DateRangeSelector';
import { useDashboardQuery } from '@/features/dashboard/hooks/use-dashboard-queries';
import { useIntegrationsQuery } from '@/features/integrations/hooks/use-integrations-queries';
import { useTriggerSync } from '@/features/sync/hooks/use-sync-mutations';
import { formatNumber, parseValue, getRelativeTime } from '@/lib/formatters';

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

const generateSparkline = (base: number, variance: number) =>
  [...Array(10)].map(() => ({ value: base + (Math.random() - 0.5) * variance }));

export default function OverviewContent() {
  const router = useRouter();
  const { isLoading: isAuthLoading, canQuery, showNoOrgMessage } = useAuthGuard();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);

  const { data: integrations, isLoading: isLoadingIntegrations } = useIntegrationsQuery();

  // Helper to format Date as YYYY-MM-DD for API
  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardQuery({
    startDate: formatDateForApi(dateRange.startDate),
    endDate: formatDateForApi(dateRange.endDate),
    compareEnabled: dateRange.compareEnabled,
    compareStartDate: dateRange.compareStartDate ? formatDateForApi(dateRange.compareStartDate) : undefined,
    compareEndDate: dateRange.compareEndDate ? formatDateForApi(dateRange.compareEndDate) : undefined,
  });

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

  const hasAnyIntegrations = integrations?.some((i) => i.isConnected) ?? false;

  useEffect(() => {
    if (canQuery && integrations !== undefined && !hasAnyIntegrations) {
      const timer = setTimeout(() => setMinLoadTimeElapsed(true), 3000);
      return () => clearTimeout(timer);
    }
    setMinLoadTimeElapsed(false);
  }, [canQuery, integrations, hasAnyIntegrations]);

  const handleManualRefresh = async () => {
    triggerSync({ force: true, days: 30 });
    refetchDashboard();
  };

  const getMetricValue = (label: string): string =>
    dashboardData?.metrics.find((m) => m.label === label)?.value || '0';

  const getMetricTrend = (label: string) => {
    const metric = dashboardData?.metrics.find((m) => m.label === label);
    return { trend: metric?.trend || 0, trendType: metric?.trendType || ('neutral' as const) };
  };

  const sallaConnected = integrations?.some((i) => i.platform === 'salla' && i.isConnected);
  const shopifyConnected = integrations?.some((i) => i.platform === 'shopify' && i.isConnected);
  const connectedEcommercePlatforms = [
    sallaConnected && 'salla',
    shopifyConnected && 'shopify',
  ].filter(Boolean) as ('salla' | 'shopify')[];

  const revenueSourceLabel = connectedEcommercePlatforms.length === 2
    ? 'from Salla & Shopify'
    : connectedEcommercePlatforms.length === 1
      ? `from ${connectedEcommercePlatforms[0] === 'salla' ? 'Salla' : 'Shopify'}`
      : 'from e-commerce';

  const pins: DashboardMetric[] = dashboardData
    ? [
        {
          label: 'Total Sales',
          value: formatNumber(parseValue(getMetricValue('Total Revenue'))),
          unit: 'SAR',
          trend: getMetricTrend('Total Revenue').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : revenueSourceLabel,
          trendType: getMetricTrend('Total Revenue').trendType,
          isPinned: true,
          sparklineData: generateSparkline(parseValue(getMetricValue('Total Revenue')) / 1000, parseValue(getMetricValue('Total Revenue')) / 5000),
          platforms: connectedEcommercePlatforms.length > 0 ? connectedEcommercePlatforms : ['salla'],
        },
        {
          label: 'Ad Spend',
          value: formatNumber(parseValue(getMetricValue('Total Spend'))),
          unit: 'SAR',
          trend: getMetricTrend('Total Spend').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'from Snapchat',
          trendType: getMetricTrend('Total Spend').trendType,
          isPinned: true,
          sparklineData: generateSparkline(parseValue(getMetricValue('Total Spend')) / 100, parseValue(getMetricValue('Total Spend')) / 500),
          platforms: ['snapchat'] as const,
        },
        {
          label: 'Net Profit',
          value: formatNumber(parseValue(getMetricValue('Net Profit'))),
          unit: 'SAR',
          trend: getMetricTrend('Net Profit').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'sales - spend',
          trendType: getMetricTrend('Net Profit').trendType || (parseValue(getMetricValue('Net Profit')) > 0 ? 'up' : 'down'),
          isPinned: true,
          sparklineData: generateSparkline(parseValue(getMetricValue('Net Profit')) / 1000, parseValue(getMetricValue('Net Profit')) / 5000),
        },
      ]
    : [];

  const customMetrics: DashboardMetric[] = dashboardData
    ? [
        {
          label: 'ROAS',
          value: parseValue(getMetricValue('Blended ROAS')).toFixed(2),
          trend: getMetricTrend('Blended ROAS').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'return on ad spend',
          trendType: getMetricTrend('Blended ROAS').trendType || (parseValue(getMetricValue('Blended ROAS')) > 1 ? 'up' : 'down'),
          sparklineData: generateSparkline(parseValue(getMetricValue('Blended ROAS')), 0.5),
        },
        {
          label: 'MER',
          value: parseValue(getMetricValue('MER')).toFixed(1),
          unit: '%',
          trend: getMetricTrend('MER').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'marketing efficiency',
          trendType: getMetricTrend('MER').trendType || (parseValue(getMetricValue('MER')) < 20 ? 'up' : 'down'),
          sparklineData: generateSparkline(parseValue(getMetricValue('MER')), 2),
        },
        {
          label: 'Net Margin',
          value: parseValue(getMetricValue('Net Margin')).toFixed(0),
          unit: '%',
          trend: getMetricTrend('Net Margin').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'profit margin',
          trendType: getMetricTrend('Net Margin').trendType || (parseValue(getMetricValue('Net Margin')) > 0 ? 'up' : 'down'),
          sparklineData: generateSparkline(parseValue(getMetricValue('Net Margin')), 5),
        },
        {
          label: 'NCPA',
          value: parseValue(getMetricValue('NCPA')).toFixed(2),
          unit: 'SAR',
          trend: getMetricTrend('NCPA').trend,
          trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'cost per acquisition',
          trendType: getMetricTrend('NCPA').trendType || 'neutral',
          sparklineData: generateSparkline(parseValue(getMetricValue('NCPA')), 10),
        },
      ]
    : [];

  const loading = isDashboardLoading || isLoadingIntegrations;
  const error = dashboardError ? (dashboardError as Error).message : null;

  if (isAuthLoading) {
    return <PageLoading />;
  }

  if (showNoOrgMessage) {
    return <NoOrganization />;
  }

  if (isLoadingIntegrations) {
    return <SkeletonState />;
  }

  if (canQuery && integrations !== undefined && !hasAnyIntegrations) {
    if (!minLoadTimeElapsed) {
      return <SkeletonState />;
    }
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <EmptyDashboard
          integrations={{
            salla: { connected: false },
            snapchat: { connected: false },
            meta: { connected: false },
            google: { connected: false },
            tiktok: { connected: false },
          }}
          onSetup={() => router.push('/onboarding')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={handleManualRefresh}
        isRefreshing={isSyncing}
        isLoading={loading}
        lastSyncAt={dashboardData?.lastSyncAt}
        fromCache={dashboardData?.fromCache}
        integrations={integrations}
      />

      {error && (
        <div className="flex items-center gap-3 bg-danger-muted border border-danger/20 text-danger px-4 py-3 text-sm" role="alert">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
          <span>{error}</span>
          <button onClick={() => refetchDashboard()} className="ml-auto text-xs font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      <MetricsGrid pins={pins} customMetrics={customMetrics} isLoading={loading} />

      <ChartsSection
        performance={dashboardData?.performance || []}
        platformSpend={dashboardData?.platformSpend || []}
        dateRange={dateRange}
        isLoading={loading}
      />

      {dashboardData && (
        <div className="text-xs text-text-muted text-center py-4">
          Data sources: {connectedEcommercePlatforms.length === 2
            ? 'Revenue from Salla & Shopify'
            : connectedEcommercePlatforms.length === 1
              ? `Revenue from ${connectedEcommercePlatforms[0] === 'salla' ? 'Salla' : 'Shopify'}`
              : 'Revenue from connected stores'} &middot; Ad spend from connected platforms
          {dashboardData.lastSyncAt && <span> &middot; Last synced: {getRelativeTime(dashboardData.lastSyncAt)}</span>}
          {dashboardData.fromCache && <span> &middot; Data refreshes automatically every 15 minutes</span>}
        </div>
      )}
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-32 skeleton mb-2" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="h-10 w-48 skeleton" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton size="hero" className="lg:col-span-1" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <MetricCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
        <div className="bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
      </div>
    </div>
  );
}
