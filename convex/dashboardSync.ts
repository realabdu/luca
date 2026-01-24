import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, getOptionalAuthContext } from "./lib/auth";

/**
 * Get cached daily metrics for a date range
 */
export const getDailyMetrics = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    storeId: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const metrics = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    // Filter by date range
    return metrics.filter((m) => {
      const inRange = m.date >= args.startDate && m.date <= args.endDate;
      const matchesStore = !args.storeId || m.storeId === args.storeId;
      return inRange && matchesStore;
    });
  },
});

/**
 * Get aggregated metrics for a date range (for dashboard cards)
 */
export const getAggregatedMetrics = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    storeId: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const dailyMetrics = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    const filtered = dailyMetrics.filter((m) => {
      const inRange = m.date >= args.startDate && m.date <= args.endDate;
      const matchesStore = !args.storeId || m.storeId === args.storeId;
      return inRange && matchesStore;
    });

    if (filtered.length === 0) {
      return null; // No cached data, caller should fetch live
    }

    // Aggregate metrics
    const totals = filtered.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        ordersCount: acc.ordersCount + m.ordersCount,
        totalSpend: acc.totalSpend + m.totalSpend,
        newCustomersCount: acc.newCustomersCount + (m.newCustomersCount || 0),
      }),
      { revenue: 0, ordersCount: 0, totalSpend: 0, newCustomersCount: 0 }
    );

    const netProfit = totals.revenue - totals.totalSpend;
    const roas = totals.totalSpend > 0 ? totals.revenue / totals.totalSpend : 0;
    const mer =
      totals.revenue > 0 ? (totals.totalSpend / totals.revenue) * 100 : 0;
    const netMargin =
      totals.revenue > 0 ? (netProfit / totals.revenue) * 100 : 0;
    const ncpa =
      totals.newCustomersCount > 0
        ? totals.totalSpend / totals.newCustomersCount
        : 0;
    const aov =
      totals.ordersCount > 0 ? totals.revenue / totals.ordersCount : 0;

    // Get the most recent sync time
    const lastSyncAt = Math.max(...filtered.map((m) => m.lastSyncAt));

    return {
      revenue: totals.revenue,
      ordersCount: totals.ordersCount,
      totalSpend: totals.totalSpend,
      newCustomersCount: totals.newCustomersCount,
      netProfit,
      roas,
      mer,
      netMargin,
      ncpa,
      averageOrderValue: aov,
      lastSyncAt,
      daysInRange: filtered.length,
    };
  },
});

/**
 * Get daily ad spend breakdown by platform
 */
export const getAdSpendByPlatform = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const adSpend = await ctx.db
      .query("adSpendDaily")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    const filtered = adSpend.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );

    // Aggregate by platform
    const byPlatform: Record<
      string,
      { spend: number; impressions: number; clicks: number; conversions: number }
    > = {};

    for (const record of filtered) {
      if (!byPlatform[record.platform]) {
        byPlatform[record.platform] = {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
      }
      byPlatform[record.platform].spend += record.spend;
      byPlatform[record.platform].impressions += record.impressions || 0;
      byPlatform[record.platform].clicks += record.clicks || 0;
      byPlatform[record.platform].conversions += record.conversions || 0;
    }

    return byPlatform;
  },
});

/**
 * Get performance data for charts (daily revenue vs spend)
 */
export const getPerformanceData = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    storeId: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const dailyMetrics = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    const filtered = dailyMetrics
      .filter((m) => {
        const inRange = m.date >= args.startDate && m.date <= args.endDate;
        const matchesStore = !args.storeId || m.storeId === args.storeId;
        return inRange && matchesStore;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return filtered.map((m) => ({
      date: formatDateForDisplay(m.date),
      revenue: m.revenue,
      spend: m.totalSpend,
    }));
  },
});

/**
 * Upsert daily metrics (for sync) - with explicit organizationId
 */
export const upsertDailyMetrics = mutation({
  args: {
    organizationId: v.id("organizations"),
    date: v.string(),
    storeId: v.optional(v.string()),
    revenue: v.number(),
    ordersCount: v.number(),
    averageOrderValue: v.number(),
    newCustomersCount: v.optional(v.number()),
    totalSpend: v.number(),
    spendByPlatform: v.optional(v.any()),
    netProfit: v.number(),
    roas: v.number(),
    mer: v.number(),
    netMargin: v.number(),
    ncpa: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if record exists for this org and date
    const existing = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    const data = {
      ...args,
      lastSyncAt: Date.now(),
      dataSource: "synced",
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("dailyMetrics", data);
    }
  },
});

/**
 * Upsert ad spend daily (for sync) - with explicit organizationId
 */
export const upsertAdSpendDaily = mutation({
  args: {
    organizationId: v.id("organizations"),
    date: v.string(),
    platform: v.string(),
    accountId: v.string(),
    spend: v.number(),
    currency: v.string(),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if record exists for this date/platform/account/org
    const existing = await ctx.db
      .query("adSpendDaily")
      .withIndex("by_account_date", (q) =>
        q.eq("accountId", args.accountId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    const data = {
      ...args,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("adSpendDaily", data);
    }
  },
});

/**
 * Upsert order (for sync) - with explicit organizationId
 */
export const upsertOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    externalId: v.string(),
    storeId: v.string(),
    source: v.union(v.literal("salla"), v.literal("zid"), v.literal("shopify")),
    orderDate: v.number(),
    totalAmount: v.number(),
    currency: v.string(),
    status: v.string(),
    customerId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    isNewCustomer: v.optional(v.boolean()),
    rawData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if order exists for this org
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    const data = {
      ...args,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("orders", data);
    }
  },
});

/**
 * Get cached orders for a date range
 */
export const getOrders = query({
  args: {
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
    storeId: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("salla"), v.literal("zid"), v.literal("shopify"))
    ),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    let orders = await ctx.db
      .query("orders")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    return orders.filter((o) => {
      const inRange =
        o.orderDate >= args.startDate && o.orderDate <= args.endDate;
      const matchesStore = !args.storeId || o.storeId === args.storeId;
      const matchesSource = !args.source || o.source === args.source;
      return inRange && matchesStore && matchesSource;
    });
  },
});

/**
 * Get last sync time for dashboard data
 */
export const getLastSyncTime = query({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const latestMetric = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .first();

    return latestMetric?.lastSyncAt || null;
  },
});

/**
 * Check if we need to sync (data is stale)
 */
export const needsSync = query({
  args: {
    maxAgeMinutes: v.optional(v.number()), // Default 15 minutes
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const maxAge = (args.maxAgeMinutes || 15) * 60 * 1000;

    const latestMetric = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .first();

    if (!latestMetric) return true;

    const age = Date.now() - latestMetric.lastSyncAt;
    return age > maxAge;
  },
});

// Helper to format date for display
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================
// API Route Queries (with explicit organizationId)
// These are used by the dashboard API route which already has the organizationId
// ============================================

/**
 * Get aggregated metrics for a date range (for API route)
 */
export const getAggregatedMetricsForOrg = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
    storeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dailyMetrics = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const filtered = dailyMetrics.filter((m) => {
      const inRange = m.date >= args.startDate && m.date <= args.endDate;
      const matchesStore = !args.storeId || m.storeId === args.storeId;
      return inRange && matchesStore;
    });

    if (filtered.length === 0) {
      return null;
    }

    const totals = filtered.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        ordersCount: acc.ordersCount + m.ordersCount,
        totalSpend: acc.totalSpend + m.totalSpend,
        newCustomersCount: acc.newCustomersCount + (m.newCustomersCount || 0),
      }),
      { revenue: 0, ordersCount: 0, totalSpend: 0, newCustomersCount: 0 }
    );

    const netProfit = totals.revenue - totals.totalSpend;
    const roas = totals.totalSpend > 0 ? totals.revenue / totals.totalSpend : 0;
    const mer =
      totals.revenue > 0 ? (totals.totalSpend / totals.revenue) * 100 : 0;
    const netMargin =
      totals.revenue > 0 ? (netProfit / totals.revenue) * 100 : 0;
    const ncpa =
      totals.newCustomersCount > 0
        ? totals.totalSpend / totals.newCustomersCount
        : 0;
    const aov =
      totals.ordersCount > 0 ? totals.revenue / totals.ordersCount : 0;

    const lastSyncAt = Math.max(...filtered.map((m) => m.lastSyncAt));

    return {
      revenue: totals.revenue,
      ordersCount: totals.ordersCount,
      totalSpend: totals.totalSpend,
      newCustomersCount: totals.newCustomersCount,
      netProfit,
      roas,
      mer,
      netMargin,
      ncpa,
      averageOrderValue: aov,
      lastSyncAt,
      daysInRange: filtered.length,
    };
  },
});

/**
 * Get performance data for charts (for API route)
 */
export const getPerformanceDataForOrg = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
    storeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dailyMetrics = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const filtered = dailyMetrics
      .filter((m) => {
        const inRange = m.date >= args.startDate && m.date <= args.endDate;
        const matchesStore = !args.storeId || m.storeId === args.storeId;
        return inRange && matchesStore;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return filtered.map((m) => ({
      date: formatDateForDisplay(m.date),
      revenue: m.revenue,
      spend: m.totalSpend,
    }));
  },
});

/**
 * Get daily ad spend breakdown by platform (for API route)
 */
export const getAdSpendByPlatformForOrg = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const adSpend = await ctx.db
      .query("adSpendDaily")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const filtered = adSpend.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );

    const byPlatform: Record<
      string,
      { spend: number; impressions: number; clicks: number; conversions: number }
    > = {};

    for (const record of filtered) {
      if (!byPlatform[record.platform]) {
        byPlatform[record.platform] = {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
      }
      byPlatform[record.platform].spend += record.spend;
      byPlatform[record.platform].impressions += record.impressions || 0;
      byPlatform[record.platform].clicks += record.clicks || 0;
      byPlatform[record.platform].conversions += record.conversions || 0;
    }

    return byPlatform;
  },
});
