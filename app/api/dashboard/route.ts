import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

interface DashboardData {
  metrics: {
    label: string;
    value: string;
    unit?: string;
    trend: number;
    trendLabel: string;
    icon: string;
    trendType: "up" | "down" | "neutral";
    color?: string;
  }[];
  performanceData: {
    date: string;
    revenue: number;
    spend: number;
  }[];
  platformSpend: {
    platform: string;
    percentage: number;
    spend: number;
    color: string;
  }[];
}

/**
 * GET /api/dashboard
 * Fetches dashboard data from Convex cache ONLY (no live API calls)
 * Data is populated by background cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex not configured" },
        { status: 500 }
      );
    }

    const client = new ConvexHttpClient(convexUrl);

    // Authenticate user and get organization
    const { userId: clerkUserId, orgId: clerkOrgId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthenticated", status: "error" },
        { status: 401 }
      );
    }

    if (!clerkOrgId) {
      return NextResponse.json(
        { error: "No organization selected", status: "error" },
        { status: 400 }
      );
    }

    // Get organization from Convex by Clerk org ID
    const organization = await client.query(api.organizations.getByClerkOrgId, {
      clerkOrgId: clerkOrgId,
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found", status: "error" },
        { status: 404 }
      );
    }

    const organizationId = organization._id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const compare = searchParams.get('compare') === 'true';
    const compareStartParam = searchParams.get('compare_start_date');
    const compareEndParam = searchParams.get('compare_end_date');

    // Default to last 30 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Format dates for Convex queries
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get data from Convex cache ONLY
    const cachedResponse = await getCachedData(
      client,
      organizationId,
      startDateStr,
      endDateStr,
      compare,
      compareStartParam,
      compareEndParam
    );

    return NextResponse.json(cachedResponse);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toFixed(0);
}

/**
 * Build metrics array from cached aggregated metrics
 */
function buildMetricsFromCache(cached: {
  revenue: number;
  totalSpend: number;
  netProfit: number;
  roas: number;
  mer: number;
  netMargin: number;
  ncpa: number;
} | null): DashboardData["metrics"] {
  if (!cached) {
    return [
      { label: "Total Revenue", value: "0", unit: "SAR", trend: 0, trendLabel: "No data yet", icon: "monitoring", trendType: "neutral" as const },
      { label: "Total Spend", value: "0", unit: "SAR", trend: 0, trendLabel: "No data yet", icon: "payments", trendType: "neutral" as const },
      { label: "Net Profit", value: "0", unit: "SAR", trend: 0, trendLabel: "No data yet", icon: "trending_up", trendType: "neutral" as const },
      { label: "Blended ROAS", value: "0.00", trend: 0, trendLabel: "No data yet", icon: "percent", trendType: "neutral" as const, color: "primary" },
      { label: "MER", value: "0.0%", trend: 0, trendLabel: "No data yet", icon: "analytics", trendType: "neutral" as const },
      { label: "Net Margin", value: "0.0%", trend: 0, trendLabel: "No data yet", icon: "account_balance", trendType: "neutral" as const },
      { label: "NCPA", value: "0", unit: "SAR", trend: 0, trendLabel: "No data yet", icon: "group_add", trendType: "neutral" as const },
    ];
  }

  return [
    {
      label: "Total Revenue",
      value: formatNumber(cached.revenue),
      unit: "SAR",
      trend: 0,
      trendLabel: "from Salla",
      icon: "monitoring",
      trendType: "neutral" as const,
    },
    {
      label: "Total Spend",
      value: formatNumber(cached.totalSpend),
      unit: "SAR",
      trend: 0,
      trendLabel: "from ad platforms",
      icon: "payments",
      trendType: "neutral" as const,
    },
    {
      label: "Net Profit",
      value: formatNumber(cached.netProfit),
      unit: "SAR",
      trend: 0,
      trendLabel: "revenue - spend",
      icon: "trending_up",
      trendType: "neutral" as const,
    },
    {
      label: "Blended ROAS",
      value: cached.roas.toFixed(2),
      trend: 0,
      trendLabel: "return on ad spend",
      icon: "percent",
      trendType: "neutral" as const,
      color: "primary",
    },
    {
      label: "MER",
      value: cached.mer.toFixed(1) + "%",
      trend: 0,
      trendLabel: "marketing efficiency",
      icon: "analytics",
      trendType: "neutral" as const,
    },
    {
      label: "Net Margin",
      value: cached.netMargin.toFixed(1) + "%",
      trend: 0,
      trendLabel: "profit margin",
      icon: "account_balance",
      trendType: "neutral" as const,
    },
    {
      label: "NCPA",
      value: formatNumber(cached.ncpa),
      unit: "SAR",
      trend: 0,
      trendLabel: "cost per acquisition",
      icon: "group_add",
      trendType: "neutral" as const,
    },
  ];
}

/**
 * Build platform spend from cached data
 */
function buildPlatformSpendFromCache(
  platformData: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> | null
): { platform: string; percentage: number; spend: number; color: string }[] {
  if (!platformData) return [];

  const platformColors: Record<string, string> = {
    snapchat: "#FFFC00",
    meta: "#1877F2",
    google: "#4285F4",
    tiktok: "#000000",
  };

  const platforms = Object.entries(platformData).map(([platform, data]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    spend: data.spend,
    color: platformColors[platform] || "#94a3b8",
  }));

  // Only include platforms with spend > 0
  const activePlatforms = platforms.filter(p => p.spend > 0);
  const totalSpend = activePlatforms.reduce((sum, p) => sum + p.spend, 0);

  if (totalSpend === 0) {
    return [];
  }

  return activePlatforms
    .map(p => ({
      ...p,
      percentage: Math.round((p.spend / totalSpend) * 100),
    }))
    .sort((a, b) => b.spend - a.spend);
}

/**
 * Get dashboard data from Convex cache
 * Returns empty data structure if no cache available
 */
async function getCachedData(
  client: ConvexHttpClient,
  organizationId: string,
  startDateStr: string,
  endDateStr: string,
  compare: boolean,
  compareStartParam: string | null,
  compareEndParam: string | null
): Promise<any> {
  // Get aggregated metrics from cache
  let cachedMetrics = null;
  try {
    cachedMetrics = await client.query(api.dashboardSync.getAggregatedMetricsForOrg, {
      organizationId,
      startDate: startDateStr,
      endDate: endDateStr,
    });
  } catch (e) {
    console.warn("[Dashboard] Failed to get cached metrics:", e);
  }

  // Get performance data (daily breakdown)
  let performanceData = [];
  try {
    performanceData = await client.query(api.dashboardSync.getPerformanceDataForOrg, {
      organizationId,
      startDate: startDateStr,
      endDate: endDateStr,
    }) || [];
  } catch (e) {
    console.warn("[Dashboard] Failed to get performance data:", e);
  }

  // Get platform spend breakdown
  let adSpendByPlatform = null;
  try {
    adSpendByPlatform = await client.query(api.dashboardSync.getAdSpendByPlatformForOrg, {
      organizationId,
      startDate: startDateStr,
      endDate: endDateStr,
    });
  } catch (e) {
    console.warn("[Dashboard] Failed to get ad spend by platform:", e);
  }

  // Build platform spend array from the map
  const platformSpend = buildPlatformSpendFromCache(adSpendByPlatform);

  // Build metrics from cached data
  const metrics = buildMetricsFromCache(cachedMetrics);

  // Calculate comparison if requested
  let comparisonData = null;
  if (compare && compareStartParam && compareEndParam && cachedMetrics) {
    try {
      const compareMetrics = await client.query(api.dashboardSync.getAggregatedMetricsForOrg, {
        organizationId,
        startDate: compareStartParam.split('T')[0],
        endDate: compareEndParam.split('T')[0],
      });

      if (compareMetrics) {
        comparisonData = {
          start: compareStartParam,
          end: compareEndParam,
          metrics: {
            revenue: compareMetrics.revenue,
            spend: compareMetrics.totalSpend,
            netProfit: compareMetrics.netProfit,
            roas: compareMetrics.roas,
            mer: compareMetrics.mer,
            netMargin: compareMetrics.netMargin,
            ncpa: compareMetrics.ncpa,
          },
        };

        // Update metrics with trend data
        const calcChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const getTrendType = (change: number, lowerIsBetter = false): "up" | "down" | "neutral" => {
          if (Math.abs(change) < 0.1) return "neutral";
          const isPositive = change > 0;
          return lowerIsBetter ? (isPositive ? "down" : "up") : (isPositive ? "up" : "down");
        };

        // Update trends in metrics
        metrics[0].trend = Math.round(calcChange(cachedMetrics.revenue, compareMetrics.revenue) * 10) / 10;
        metrics[0].trendType = getTrendType(metrics[0].trend);
        metrics[0].trendLabel = "vs previous period";

        metrics[1].trend = Math.round(calcChange(cachedMetrics.totalSpend, compareMetrics.totalSpend) * 10) / 10;
        metrics[1].trendType = getTrendType(metrics[1].trend, true);
        metrics[1].trendLabel = "vs previous period";

        metrics[2].trend = Math.round(calcChange(cachedMetrics.netProfit, compareMetrics.netProfit) * 10) / 10;
        metrics[2].trendType = getTrendType(metrics[2].trend);
        metrics[2].trendLabel = "vs previous period";

        metrics[3].trend = Math.round(calcChange(cachedMetrics.roas, compareMetrics.roas) * 10) / 10;
        metrics[3].trendType = getTrendType(metrics[3].trend);
        metrics[3].trendLabel = "vs previous period";

        metrics[4].trend = Math.round(calcChange(cachedMetrics.mer, compareMetrics.mer) * 10) / 10;
        metrics[4].trendType = getTrendType(metrics[4].trend, true);
        metrics[4].trendLabel = "vs previous period";

        metrics[5].trend = Math.round(calcChange(cachedMetrics.netMargin, compareMetrics.netMargin) * 10) / 10;
        metrics[5].trendType = getTrendType(metrics[5].trend);
        metrics[5].trendLabel = "vs previous period";

        metrics[6].trend = Math.round(calcChange(cachedMetrics.ncpa, compareMetrics.ncpa) * 10) / 10;
        metrics[6].trendType = getTrendType(metrics[6].trend, true);
        metrics[6].trendLabel = "vs previous period";
      }
    } catch (e) {
      console.warn("[Dashboard] Failed to get comparison metrics:", e);
    }
  }

  const lastSyncAt = cachedMetrics?.lastSyncAt || Date.now();

  return {
    metrics,
    performanceData: performanceData || [],
    platformSpend,
    status: cachedMetrics ? "complete" : "no_data",
    warnings: [],
    period: {
      start: new Date(startDateStr).toISOString(),
      end: new Date(endDateStr).toISOString(),
    },
    comparison: comparisonData,
    lastSyncAt,
    lastSyncAtFormatted: new Date(lastSyncAt).toISOString(),
    fromCache: true,
    _debug: {
      source: "cache",
      hasData: !!cachedMetrics,
      connectionStatus: {
        salla: { connected: true, error: null },
        snapchat: { connected: true, error: null },
      },
    },
  };
}
