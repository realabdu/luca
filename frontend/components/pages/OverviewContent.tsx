'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useOrganization } from '@clerk/nextjs';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { MetricCard, MetricCardSkeleton } from '@/components/dashboard/MetricCard';
import { DynamicPerformanceChart } from '@/components/dashboard/DynamicPerformanceChart';
import {
  DateRangeSelector,
  DateRange,
  getDefaultDateRange,
} from '@/components/dashboard/DateRangeSelector';
import EmptyDashboard from '@/components/dashboard/EmptyDashboard';
import { useApiQuery, Integration } from '@/lib/api-client';

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
  platforms?: ('salla' | 'meta' | 'google' | 'tiktok' | 'snapchat')[];
}

interface ApiDashboardData {
  metrics: {
    label: string;
    value: string;
    unit?: string;
    trend: number;
    trendLabel: string;
    trendType: 'up' | 'down' | 'neutral';
  }[];
  performanceData: { date: string; revenue: number; spend: number }[];
  platformSpend: { platform: string; percentage: number; spend: number; color: string }[];
  lastSyncAt?: number;
  lastSyncAtFormatted?: string;
  fromCache?: boolean;
  cacheAgeMinutes?: number;
  _debug?: {
    source?: 'cache' | 'live';
    connectionStatus: {
      salla: { connected: boolean; error: string | null };
      snapchat: { connected: boolean; error: string | null };
    };
  };
}

interface TrendData {
  trend: number;
  trendType: 'up' | 'down' | 'neutral';
}

interface DashboardData {
  totalSales: number;
  adSpend: number;
  netProfit: number;
  roas: number;
  mer: number;
  netMargin: number;
  ncpa: number;
  performanceData: { date: string; revenue: number; spend: number }[];
  platformSpend: { platform: string; percentage: number; spend: number; color: string }[];
  connectionStatus: {
    salla: { connected: boolean; error: string | null };
    snapchat: { connected: boolean; error: string | null };
  };
  trends?: {
    totalSales: TrendData;
    adSpend: TrendData;
    netProfit: TrendData;
    roas: TrendData;
    mer: TrendData;
    netMargin: TrendData;
    ncpa: TrendData;
  };
}

// Sparkline generator
const generateSparkline = (base: number, variance: number) =>
  [...Array(10)].map(() => ({ value: base + (Math.random() - 0.5) * variance }));

// Format number for display
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

export default function OverviewContent() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncAt: number | null;
    fromCache: boolean;
    isRefreshing: boolean;
  }>({
    lastSyncAt: null,
    fromCache: false,
    isRefreshing: false,
  });

  // Only query integrations when authenticated AND an organization is selected
  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  // Fetch integrations from Django API
  const { data: integrationsData } = useApiQuery<Integration[]>(
    canQuery ? '/integrations/' : null
  );
  const integrations = integrationsData;

  // Derive integration status
  const sallaIntegration = integrations?.find(
    (i) => i.platform === "salla" && i.is_connected
  );
  const snapchatIntegration = integrations?.find(
    (i) => i.platform === "snapchat" && i.is_connected
  );
  const metaIntegration = integrations?.find(
    (i) => i.platform === "meta" && i.is_connected
  );
  const googleIntegration = integrations?.find(
    (i) => i.platform === "google" && i.is_connected
  );
  const tiktokIntegration = integrations?.find(
    (i) => i.platform === "tiktok" && i.is_connected
  );

  const hasAnyIntegrations = !!sallaIntegration || !!snapchatIntegration ||
    !!metaIntegration || !!googleIntegration || !!tiktokIntegration;

  // Check if integrations are still loading
  const isLoadingIntegrations = canQuery && integrations === undefined;

  // Add minimum load time for new users without integrations to avoid jarring transition
  useEffect(() => {
    if (canQuery && integrations !== undefined && !hasAnyIntegrations) {
      const timer = setTimeout(() => setMinLoadTimeElapsed(true), 3000);
      return () => clearTimeout(timer);
    }
    setMinLoadTimeElapsed(false);
  }, [canQuery, integrations, hasAnyIntegrations]);

  const fetchDashboardData = useCallback(async (range: DateRange, forceLive = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams({
        start_date: range.startDate.toISOString(),
        end_date: range.endDate.toISOString(),
      });

      if (range.compareEnabled && range.compareStartDate && range.compareEndDate) {
        params.set('compare', 'true');
        params.set('compare_start_date', range.compareStartDate.toISOString());
        params.set('compare_end_date', range.compareEndDate.toISOString());
      }

      if (forceLive) {
        params.set('live', 'true');
      }

      const response = await fetch(`/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const apiData: ApiDashboardData = await response.json();

      // Extract raw values from API response
      const totalSalesStr = apiData.metrics.find(m => m.label === 'Total Revenue')?.value || '0';
      const adSpendStr = apiData.metrics.find(m => m.label === 'Total Spend')?.value || '0';
      const netProfitStr = apiData.metrics.find(m => m.label === 'Net Profit')?.value || '0';
      const roasStr = apiData.metrics.find(m => m.label === 'Blended ROAS')?.value || '0';
      const merStr = apiData.metrics.find(m => m.label === 'MER')?.value || '0';
      const netMarginStr = apiData.metrics.find(m => m.label === 'Net Margin')?.value || '0';
      const ncpaStr = apiData.metrics.find(m => m.label === 'NCPA')?.value || '0';

      // Parse values (handle K, M suffixes and percentages)
      const parseValue = (str: string): number => {
        const cleanStr = str.replace('%', '');
        const num = parseFloat(cleanStr.replace(/[^0-9.-]/g, ''));
        if (str.includes('M')) return num * 1000000;
        if (str.includes('K')) return num * 1000;
        return num;
      };

      // Extract trends from API
      const getTrend = (label: string) => {
        const metric = apiData.metrics.find(m => m.label === label);
        return {
          trend: metric?.trend || 0,
          trendType: metric?.trendType || 'neutral' as const,
        };
      };

      setDashboardData({
        totalSales: parseValue(totalSalesStr),
        adSpend: parseValue(adSpendStr),
        netProfit: parseValue(netProfitStr),
        roas: parseValue(roasStr),
        mer: parseValue(merStr),
        netMargin: parseValue(netMarginStr),
        ncpa: parseValue(ncpaStr),
        performanceData: apiData.performanceData,
        platformSpend: apiData.platformSpend,
        connectionStatus: apiData._debug?.connectionStatus || {
          salla: { connected: false, error: null },
          snapchat: { connected: false, error: null },
        },
        trends: {
          totalSales: getTrend('Total Revenue'),
          adSpend: getTrend('Total Spend'),
          netProfit: getTrend('Net Profit'),
          roas: getTrend('Blended ROAS'),
          mer: getTrend('MER'),
          netMargin: getTrend('Net Margin'),
          ncpa: getTrend('NCPA'),
        },
      });

      // Update sync status
      setSyncStatus({
        lastSyncAt: apiData.lastSyncAt || Date.now(),
        fromCache: apiData.fromCache || false,
        isRefreshing: false,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(dateRange);
  }, [dateRange, fetchDashboardData]);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const handleManualRefresh = async () => {
    setSyncStatus(prev => ({ ...prev, isRefreshing: true }));

    // Trigger sync to populate/refresh cached data
    try {
      const syncResponse = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, days: 30 }),
      });
      await syncResponse.json();
    } catch (error) {
      console.error('[Dashboard] Sync error:', error);
    }

    // Fetch dashboard data from cache
    await fetchDashboardData(dateRange);
    setSyncStatus(prev => ({ ...prev, isRefreshing: false }));
  };

  // Format relative time
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Build metrics from real data with trends from API
  const trends = dashboardData?.trends;

  const pins: DashboardMetric[] = dashboardData ? [
    {
      label: 'Total Sales',
      value: formatNumber(dashboardData.totalSales),
      unit: 'SAR',
      trend: trends?.totalSales.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'from Salla',
      trendType: trends?.totalSales.trendType || 'neutral',
      isPinned: true,
      sparklineData: generateSparkline(dashboardData.totalSales / 1000, dashboardData.totalSales / 5000),
      platforms: ['salla'] as const,
    },
    {
      label: 'Ad Spend',
      value: formatNumber(dashboardData.adSpend),
      unit: 'SAR',
      trend: trends?.adSpend.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'from Snapchat',
      trendType: trends?.adSpend.trendType || 'neutral',
      isPinned: true,
      sparklineData: generateSparkline(dashboardData.adSpend / 100, dashboardData.adSpend / 500),
      platforms: ['snapchat'] as const,
    },
    {
      label: 'Net Profit',
      value: formatNumber(dashboardData.netProfit),
      unit: 'SAR',
      trend: trends?.netProfit.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'sales - spend',
      trendType: trends?.netProfit.trendType || (dashboardData.netProfit > 0 ? 'up' : 'down'),
      isPinned: true,
      sparklineData: generateSparkline(dashboardData.netProfit / 1000, dashboardData.netProfit / 5000)
    },
  ] : [];

  const customMetrics: DashboardMetric[] = dashboardData ? [
    {
      label: 'ROAS',
      value: dashboardData.roas.toFixed(2),
      trend: trends?.roas.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'return on ad spend',
      trendType: trends?.roas.trendType || (dashboardData.roas > 1 ? 'up' : 'down'),
      sparklineData: generateSparkline(dashboardData.roas, 0.5)
    },
    {
      label: 'MER',
      value: dashboardData.mer.toFixed(1),
      unit: '%',
      trend: trends?.mer.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'marketing efficiency',
      trendType: trends?.mer.trendType || (dashboardData.mer < 20 ? 'up' : 'down'),
      sparklineData: generateSparkline(dashboardData.mer, 2)
    },
    {
      label: 'Net Margin',
      value: dashboardData.netMargin.toFixed(0),
      unit: '%',
      trend: trends?.netMargin.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'profit margin',
      trendType: trends?.netMargin.trendType || (dashboardData.netMargin > 0 ? 'up' : 'down'),
      sparklineData: generateSparkline(dashboardData.netMargin, 5)
    },
    {
      label: 'NCPA',
      value: dashboardData.ncpa.toFixed(2),
      unit: 'SAR',
      trend: trends?.ncpa.trend || 0,
      trendLabel: dateRange.compareEnabled ? 'vs previous period' : 'cost per acquisition',
      trendType: trends?.ncpa.trendType || 'neutral',
      sparklineData: generateSparkline(dashboardData.ncpa, 10)
    },
  ] : [];

  const performance = dashboardData?.performanceData || [];
  const platformSpend = dashboardData?.platformSpend || [];

  // Show loading state while auth or organization is loading
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Show message if no organization is selected
  if (isSignedIn && !organization) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="size-16 bg-slate-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px] text-text-muted">business</span>
          </div>
          <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
          <p className="text-text-muted mb-4">Please select or create an organization to continue.</p>
        </div>
      </div>
    );
  }

  // Show loading state while integrations are loading
  if (isLoadingIntegrations) {
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
        {/* Secondary metrics - 4 column */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <MetricCardSkeleton key={i} />)}
        </div>
        {/* Charts */}
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

  // Show empty state if no integrations are connected
  if (canQuery && integrations !== undefined && !hasAnyIntegrations) {
    // Show skeleton during 3-second transition for smoother UX
    if (!minLoadTimeElapsed) {
      return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="h-8 w-32 skeleton mb-2" />
              <div className="h-4 w-64 skeleton" />
            </div>
            <div className="h-10 w-48 skeleton" />
          </div>
          {/* Main metrics - 3 column */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton size="hero" className="lg:col-span-1" />
          </div>
          {/* Secondary metrics - 4 column */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <MetricCardSkeleton key={i} />)}
          </div>
          {/* Charts */}
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
    // After 3 seconds, show EmptyDashboard
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
          onSetup={() => router.push("/onboarding")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight text-balance">Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-text-muted text-pretty">
              Real-time analytics from your connected platforms
            </p>
            {syncStatus.lastSyncAt && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="text-slate-300">|</span>
                {syncStatus.fromCache && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-text-muted">
                    <span className="material-symbols-outlined text-[12px]">cached</span>
                    Cached
                  </span>
                )}
                <span>Updated {getRelativeTime(syncStatus.lastSyncAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Pills */}
          {canQuery && integrations !== undefined && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
                sallaIntegration ? 'bg-success-muted text-success' : 'bg-slate-100 text-text-muted'
              }`}>
                <span className={`size-1.5 ${sallaIntegration ? 'bg-success' : 'bg-slate-300'}`} />
                Salla
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
                snapchatIntegration ? 'bg-success-muted text-success' : 'bg-slate-100 text-text-muted'
              }`}>
                <span className={`size-1.5 ${snapchatIntegration ? 'bg-success' : 'bg-slate-300'}`} />
                Snapchat
              </div>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={loading || syncStatus.isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main hover:bg-slate-100 border border-border-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh data"
          >
            <span className={`material-symbols-outlined text-[16px] ${syncStatus.isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 bg-danger-muted border border-danger/20 text-danger px-4 py-3 text-sm">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
          <button
            onClick={() => fetchDashboardData(dateRange)}
            className="ml-auto text-xs font-semibold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bento Grid - Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton size="hero" className="lg:col-span-1" />
          </>
        ) : (
          <>
            {/* Total Sales */}
            <MetricCard {...pins[0]} />
            {/* Ad Spend */}
            <MetricCard {...pins[1]} />
            {/* Net Profit - Hero Card */}
            <MetricCard {...pins[2]} size="hero" className="lg:col-span-1" />
          </>
        )}
      </div>

      {/* Secondary Metrics - 4 column grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <MetricCardSkeleton key={i} />)}
        </div>
      ) : customMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {customMetrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} showSparkline={false} />
          ))}
        </div>
      )}

      {/* Charts Section */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-border-light p-6 h-80">
            <div className="skeleton h-full" />
          </div>
          <div className="bg-white border border-border-light p-6 h-80">
            <div className="skeleton h-full" />
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Performance Chart - Takes 2 columns */}
        <div className="xl:col-span-2 bg-white border border-border-light p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-base font-semibold text-text-main">Performance Over Time</h3>
              <p className="text-xs text-text-muted mt-1">
                Revenue vs Spend &middot; {dateRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-3 bg-success"></span>
                <span className="text-text-muted font-medium">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400"></span>
                <span className="text-text-muted font-medium">Spend</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            {performance.length > 0 ? (
              <DynamicPerformanceChart
                data={performance}
                width={800}
                height={280}
                upColor="#10B981"
                downColor="#0891B2"
                spendColor="#94a3b8"
                className="w-full h-full"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted">
                <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">show_chart</span>
                <span className="text-sm">No performance data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Platform Spend Chart - Takes 1 column */}
        <div className="bg-white border border-border-light p-6 flex flex-col">
          <h3 className="text-base font-semibold text-text-main mb-6">Spend by Platform</h3>
          <div className="flex-1 min-h-[200px]">
            {platformSpend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformSpend} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barSize={28}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="platform"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ payload, label }) => {
                      if (payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-border-light shadow-lg">
                            <p className="font-semibold text-text-main mb-1">{label}</p>
                            <p className="text-xs text-text-muted">
                              Spend: <span className="font-semibold text-text-main">SAR {data.spend.toLocaleString()}</span>
                            </p>
                            <p className="text-xs text-text-muted">
                              Share: <span className="font-semibold text-text-main">{data.percentage}%</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" radius={[0, 0, 0, 0]} background={{ fill: '#f1f5f9' }}>
                    {platformSpend.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted">
                <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">pie_chart</span>
                <span className="text-sm">No platform data</span>
              </div>
            )}
          </div>

          {/* Legend */}
          {platformSpend.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-border-light">
              {platformSpend.map((p) => (
                <div key={p.platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5" style={{ backgroundColor: p.color }}></span>
                    <span className="text-text-main font-medium">{p.platform}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted tabular-nums">SAR {p.spend.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-text-main bg-slate-100 px-2 py-0.5 tabular-nums">
                      {p.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Footer Notice */}
      {dashboardData && (
        <div className="text-xs text-text-muted text-center py-4">
          Data sources: Revenue from Salla &middot; Ad spend from connected platforms
          {syncStatus.lastSyncAt && (
            <span> &middot; Last synced: {getRelativeTime(syncStatus.lastSyncAt)}</span>
          )}
          {syncStatus.fromCache && (
            <span> &middot; Data refreshes automatically every 15 minutes</span>
          )}
        </div>
      )}
    </div>
  );
}
