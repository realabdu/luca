import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { decrypt } from "./lib/encryption";

// Platform types for type safety
type Platform = "snapchat" | "meta" | "google" | "tiktok" | "salla";

// ============================================
// Internal Queries (for fetching data within actions)
// ============================================

/**
 * Get all organizations with connected integrations
 */
export const getAllOrganizationsWithIntegrations = internalQuery({
  args: {},
  handler: async (ctx) => {
    const integrations = await ctx.db
      .query("integrations")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    // Group by organization
    const orgMap = new Map<Id<"organizations">, typeof integrations>();
    for (const integration of integrations) {
      if (!integration.organizationId) continue;
      const existing = orgMap.get(integration.organizationId) || [];
      existing.push(integration);
      orgMap.set(integration.organizationId, existing);
    }

    return Array.from(orgMap.entries()).map(([orgId, integrations]) => ({
      organizationId: orgId,
      integrations,
    }));
  },
});

/**
 * Get integration credentials for a specific org and platform
 */
export const getIntegrationCredentials = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", args.organizationId).eq("platform", args.platform as Platform)
      )
      .first();
  },
});

/**
 * Get cached orders for a date range
 */
export const getOrdersForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return orders.filter(
      (o) => o.orderDate >= args.startDate && o.orderDate <= args.endDate
    );
  },
});

/**
 * Get ad spend for a date range
 */
export const getAdSpendForOrg = internalQuery({
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

    return adSpend.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );
  },
});

// ============================================
// Internal Mutations (for storing data)
// ============================================

/**
 * Upsert ad spend daily record
 */
export const upsertAdSpendDailyInternal = internalMutation({
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
 * Upsert order record
 */
export const upsertOrderInternal = internalMutation({
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
 * Upsert daily metrics record
 */
export const upsertDailyMetricsInternal = internalMutation({
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
 * Upsert campaign record
 */
export const upsertCampaignInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    externalId: v.string(),
    platform: v.union(
      v.literal("Meta"),
      v.literal("Google"),
      v.literal("TikTok"),
      v.literal("Snapchat"),
      v.literal("X"),
      v.literal("Klaviyo")
    ),
    name: v.string(),
    status: v.union(
      v.literal("Active"),
      v.literal("Paused"),
      v.literal("Learning"),
      v.literal("Inactive")
    ),
    spend: v.number(),
    revenue: v.number(),
    roas: v.number(),
    cpa: v.number(),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("campaigns")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    const data = {
      ...args,
      lastSyncAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("campaigns", data);
    }
  },
});

/**
 * Update integration last sync time
 */
export const updateIntegrationLastSync = internalMutation({
  args: {
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.integrationId, {
      lastSyncAt: Date.now(),
    });
  },
});

/**
 * Create sync log entry
 */
export const createSyncLogInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    integrationId: v.id("integrations"),
    syncType: v.union(
      v.literal("campaigns"),
      v.literal("events"),
      v.literal("orders"),
      v.literal("metrics"),
      v.literal("full")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncLogs", {
      ...args,
      status: "in_progress",
      recordsProcessed: 0,
      startedAt: Date.now(),
    });
  },
});

/**
 * Complete sync log entry
 */
export const completeSyncLogInternal = internalMutation({
  args: {
    logId: v.id("syncLogs"),
    status: v.union(v.literal("success"), v.literal("failed")),
    recordsProcessed: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: args.status,
      recordsProcessed: args.recordsProcessed,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});

// ============================================
// Internal Actions (called by crons)
// ============================================

/**
 * Sync ad spend from all connected ad platforms
 * Called every 30 minutes by cron
 */
export const syncAllAdSpend = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[Sync] Starting ad spend sync for all organizations");

    const orgsWithIntegrations = await ctx.runQuery(
      internal.sync.getAllOrganizationsWithIntegrations,
      {}
    );

    console.log(`[Sync] Found ${orgsWithIntegrations.length} organizations with integrations`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Sync last 7 days

    let totalRecords = 0;

    for (const { organizationId, integrations } of orgsWithIntegrations) {
      console.log(`[Sync] Processing org ${organizationId} with ${integrations.length} integrations`);

      for (const integration of integrations) {
        // Skip non-ad platforms
        if (integration.platform === "salla") continue;

        try {
          const records = await syncAdSpendForIntegration(
            ctx,
            organizationId,
            integration,
            startDate,
            endDate
          );
          totalRecords += records;

          // Update last sync time
          await ctx.runMutation(internal.sync.updateIntegrationLastSync, {
            integrationId: integration._id,
          });
        } catch (error) {
          console.error(
            `[Sync] Failed to sync ad spend for ${integration.platform}:`,
            error
          );
        }
      }
    }

    console.log(`[Sync] Ad spend sync complete. Total records: ${totalRecords}`);
    return { success: true, totalRecords };
  },
});

/**
 * Sync campaigns from all connected ad platforms
 * Called every 2 hours by cron
 */
export const syncAllCampaigns = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[Sync] Starting campaigns sync for all organizations");

    const orgsWithIntegrations = await ctx.runQuery(
      internal.sync.getAllOrganizationsWithIntegrations,
      {}
    );

    let totalCampaigns = 0;

    for (const { organizationId, integrations } of orgsWithIntegrations) {
      for (const integration of integrations) {
        // Skip non-ad platforms
        if (integration.platform === "salla") continue;

        try {
          const campaigns = await syncCampaignsForIntegration(
            ctx,
            organizationId,
            integration
          );
          totalCampaigns += campaigns;

          await ctx.runMutation(internal.sync.updateIntegrationLastSync, {
            integrationId: integration._id,
          });
        } catch (error) {
          console.error(
            `[Sync] Failed to sync campaigns for ${integration.platform}:`,
            error
          );
        }
      }
    }

    console.log(`[Sync] Campaigns sync complete. Total campaigns: ${totalCampaigns}`);
    return { success: true, totalCampaigns };
  },
});

/**
 * Calculate and store daily metrics for all organizations
 * Called every hour by cron
 */
export const calculateDailyMetrics = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[Sync] Starting daily metrics calculation for all organizations");

    const orgsWithIntegrations = await ctx.runQuery(
      internal.sync.getAllOrganizationsWithIntegrations,
      {}
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Calculate last 30 days

    let totalDays = 0;

    for (const { organizationId } of orgsWithIntegrations) {
      try {
        const days = await calculateMetricsForOrg(
          ctx,
          organizationId,
          startDate,
          endDate
        );
        totalDays += days;
      } catch (error) {
        console.error(
          `[Sync] Failed to calculate metrics for org ${organizationId}:`,
          error
        );
      }
    }

    console.log(`[Sync] Daily metrics calculation complete. Total days: ${totalDays}`);
    return { success: true, totalDays };
  },
});

/**
 * Sync orders from all connected e-commerce platforms
 * Called every 15 minutes by cron (backup for webhooks)
 */
export const syncAllOrders = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[Sync] Starting orders sync for all organizations");

    const orgsWithIntegrations = await ctx.runQuery(
      internal.sync.getAllOrganizationsWithIntegrations,
      {}
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Sync last 7 days

    let totalOrders = 0;

    for (const { organizationId, integrations } of orgsWithIntegrations) {
      // Find Salla integration
      const sallaIntegration = integrations.find((i) => i.platform === "salla");
      if (!sallaIntegration) continue;

      try {
        const orders = await syncOrdersForIntegration(
          ctx,
          organizationId,
          sallaIntegration,
          startDate,
          endDate
        );
        totalOrders += orders;

        await ctx.runMutation(internal.sync.updateIntegrationLastSync, {
          integrationId: sallaIntegration._id,
        });
      } catch (error) {
        console.error(
          `[Sync] Failed to sync orders for org ${organizationId}:`,
          error
        );
      }
    }

    console.log(`[Sync] Orders sync complete. Total orders: ${totalOrders}`);
    return { success: true, totalOrders };
  },
});

// ============================================
// Helper Functions for Sync Actions
// ============================================

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY not configured in Convex environment");
  }
  return key;
}

/**
 * Sync ad spend for a specific integration
 */
async function syncAdSpendForIntegration(
  ctx: any,
  organizationId: Id<"organizations">,
  integration: any,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const platform = integration.platform as string;
  const accountId = integration.accountId;

  // Decrypt the access token
  const encryptionKey = getEncryptionKey();
  const accessToken = await decrypt(integration.accessToken, encryptionKey);

  console.log(`[Sync] Syncing ${platform} ad spend for account ${accountId}`);

  // Call platform-specific API to get daily stats
  const dailyStats = await fetchAdSpendFromPlatform(
    platform,
    accessToken,
    accountId,
    startDate,
    endDate
  );

  // Store each day's data
  for (const day of dailyStats) {
    await ctx.runMutation(internal.sync.upsertAdSpendDailyInternal, {
      organizationId,
      date: day.date,
      platform,
      accountId,
      spend: day.spend,
      currency: day.currency || "SAR",
      impressions: day.impressions,
      clicks: day.clicks,
      conversions: day.conversions,
    });
  }

  return dailyStats.length;
}

/**
 * Sync campaigns for a specific integration
 */
async function syncCampaignsForIntegration(
  ctx: any,
  organizationId: Id<"organizations">,
  integration: any
): Promise<number> {
  const platform = integration.platform as string;
  const accountId = integration.accountId;

  // Decrypt the access token
  const encryptionKey = getEncryptionKey();
  const accessToken = await decrypt(integration.accessToken, encryptionKey);

  console.log(`[Sync] Syncing ${platform} campaigns for account ${accountId}`);

  const campaigns = await fetchCampaignsFromPlatform(
    platform,
    accessToken,
    accountId
  );

  // Map platform name to schema platform type
  const platformMap: Record<string, "Meta" | "Google" | "TikTok" | "Snapchat"> = {
    meta: "Meta",
    google: "Google",
    tiktok: "TikTok",
    snapchat: "Snapchat",
  };

  for (const campaign of campaigns) {
    await ctx.runMutation(internal.sync.upsertCampaignInternal, {
      organizationId,
      externalId: campaign.externalId,
      platform: platformMap[platform] || "Meta",
      name: campaign.name,
      status: campaign.status,
      spend: campaign.spend,
      revenue: campaign.revenue,
      roas: campaign.roas,
      cpa: campaign.cpa,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
    });
  }

  return campaigns.length;
}

/**
 * Sync orders for a specific Salla integration
 */
async function syncOrdersForIntegration(
  ctx: any,
  organizationId: Id<"organizations">,
  integration: any,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const accountId = integration.accountId;

  // Decrypt the access token
  const encryptionKey = getEncryptionKey();
  const accessToken = await decrypt(integration.accessToken, encryptionKey);

  console.log(`[Sync] Syncing Salla orders for store ${accountId}`);

  const orders = await fetchOrdersFromSalla(
    accessToken,
    startDate,
    endDate
  );

  for (const order of orders) {
    await ctx.runMutation(internal.sync.upsertOrderInternal, {
      organizationId,
      externalId: String(order.id),
      storeId: accountId,
      source: "salla" as const,
      orderDate: new Date(order.date?.date || order.created_at).getTime(),
      totalAmount: parseFloat(order.amounts?.total?.amount || order.total || 0),
      currency: order.amounts?.total?.currency || order.currency || "SAR",
      status: order.status?.name || order.status || "unknown",
      customerId: order.customer?.id ? String(order.customer.id) : undefined,
      customerEmail: order.customer?.email,
      isNewCustomer: order.customer?.orders_count === 1,
      rawData: order,
    });
  }

  return orders.length;
}

/**
 * Calculate metrics for a specific organization
 */
async function calculateMetricsForOrg(
  ctx: any,
  organizationId: Id<"organizations">,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Get orders for date range
  const orders = await ctx.runQuery(internal.sync.getOrdersForOrg, {
    organizationId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  // Get ad spend for date range
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const adSpend = await ctx.runQuery(internal.sync.getAdSpendForOrg, {
    organizationId,
    startDate: startStr,
    endDate: endStr,
  });

  // Group orders by date
  const ordersByDate: Record<string, typeof orders> = {};
  for (const order of orders) {
    const dateStr = new Date(order.orderDate).toISOString().split("T")[0];
    if (!ordersByDate[dateStr]) {
      ordersByDate[dateStr] = [];
    }
    ordersByDate[dateStr].push(order);
  }

  // Group ad spend by date and platform
  const spendByDate: Record<string, Record<string, number>> = {};
  for (const spend of adSpend) {
    if (!spendByDate[spend.date]) {
      spendByDate[spend.date] = {};
    }
    spendByDate[spend.date][spend.platform] =
      (spendByDate[spend.date][spend.platform] || 0) + spend.spend;
  }

  // Calculate metrics for each day
  let count = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOrders = ordersByDate[dateStr] || [];
    const daySpend = spendByDate[dateStr] || {};

    // Calculate revenue
    const revenue = dayOrders.reduce(
      (sum: number, o: any) => sum + (o.totalAmount || 0),
      0
    );
    const ordersCount = dayOrders.length;
    const newCustomersCount = dayOrders.filter((o: any) => o.isNewCustomer).length;
    const averageOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

    // Calculate total spend
    const totalSpend = Object.values(daySpend).reduce(
      (sum: number, s: number) => sum + s,
      0
    );

    // Calculate derived metrics
    const netProfit = revenue - totalSpend;
    const roas = totalSpend > 0 ? revenue / totalSpend : 0;
    const mer = revenue > 0 ? (totalSpend / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const ncpa = newCustomersCount > 0 ? totalSpend / newCustomersCount : 0;

    // Store metrics
    await ctx.runMutation(internal.sync.upsertDailyMetricsInternal, {
      organizationId,
      date: dateStr,
      revenue,
      ordersCount,
      averageOrderValue,
      newCustomersCount,
      totalSpend,
      spendByPlatform: daySpend,
      netProfit,
      roas,
      mer,
      netMargin,
      ncpa,
    });

    count++;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

// ============================================
// Platform API Helpers (fetch from external APIs)
// ============================================

const SNAPCHAT_API_BASE = "https://adsapi.snapchat.com/v1";
const META_API_BASE = "https://graph.facebook.com/v18.0";
const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v14";
const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";
const SALLA_API_BASE = "https://api.salla.dev";

// Currency conversion (USD to SAR)
const USD_TO_SAR = 3.75;

interface DailyStats {
  date: string;
  spend: number;
  currency: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

interface CampaignData {
  externalId: string;
  name: string;
  status: "Active" | "Paused" | "Learning" | "Inactive";
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

/**
 * Fetch ad spend from the appropriate platform API
 */
async function fetchAdSpendFromPlatform(
  platform: string,
  accessToken: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyStats[]> {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  switch (platform) {
    case "snapchat":
      return fetchSnapchatAdSpend(accessToken, accountId, startStr, endStr);
    case "meta":
      return fetchMetaAdSpend(accessToken, accountId, startStr, endStr);
    case "google":
      return fetchGoogleAdSpend(accessToken, accountId, startStr, endStr);
    case "tiktok":
      return fetchTikTokAdSpend(accessToken, accountId, startStr, endStr);
    default:
      console.warn(`[Sync] Unknown platform: ${platform}`);
      return [];
  }
}

/**
 * Fetch campaigns from the appropriate platform API
 */
async function fetchCampaignsFromPlatform(
  platform: string,
  accessToken: string,
  accountId: string
): Promise<CampaignData[]> {
  switch (platform) {
    case "snapchat":
      return fetchSnapchatCampaigns(accessToken, accountId);
    case "meta":
      return fetchMetaCampaigns(accessToken, accountId);
    case "google":
      return fetchGoogleCampaigns(accessToken, accountId);
    case "tiktok":
      return fetchTikTokCampaigns(accessToken, accountId);
    default:
      console.warn(`[Sync] Unknown platform: ${platform}`);
      return [];
  }
}

// Snapchat API helpers
async function fetchSnapchatAdSpend(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  try {
    const response = await fetch(
      `${SNAPCHAT_API_BASE}/adaccounts/${accountId}/stats?` +
        new URLSearchParams({
          granularity: "DAY",
          start_time: startDate,
          end_time: endDate,
          fields: "spend",
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Snapchat API error: ${response.status}`);
    }

    const data = await response.json();
    const timeseries =
      data.timeseries_stats?.[0]?.timeseries_stat?.timeseries || [];

    return timeseries.map((ts: any) => ({
      date: ts.start_time.split("T")[0],
      spend: ((ts.stats?.spend || 0) / 1_000_000) * USD_TO_SAR, // Convert micros USD to SAR
      currency: "SAR",
      impressions: ts.stats?.impressions || 0,
      clicks: ts.stats?.swipes || 0,
      conversions: ts.stats?.conversion_purchases || 0,
    }));
  } catch (error) {
    console.error("[Sync] Snapchat ad spend fetch error:", error);
    return [];
  }
}

async function fetchSnapchatCampaigns(
  accessToken: string,
  accountId: string
): Promise<CampaignData[]> {
  try {
    const response = await fetch(
      `${SNAPCHAT_API_BASE}/adaccounts/${accountId}/campaigns`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Snapchat API error: ${response.status}`);
    }

    const data = await response.json();
    const campaigns = data.campaigns || [];

    return campaigns.map((c: any) => ({
      externalId: c.campaign.id,
      name: c.campaign.name,
      status: mapCampaignStatus(c.campaign.status),
      spend: 0,
      revenue: 0,
      roas: 0,
      cpa: 0,
    }));
  } catch (error) {
    console.error("[Sync] Snapchat campaigns fetch error:", error);
    return [];
  }
}

// Meta API helpers
async function fetchMetaAdSpend(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  try {
    const response = await fetch(
      `${META_API_BASE}/act_${accountId}/insights?` +
        new URLSearchParams({
          access_token: accessToken,
          time_range: JSON.stringify({
            since: startDate,
            until: endDate,
          }),
          time_increment: "1",
          fields: "spend,impressions,clicks,actions",
        }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((day: any) => ({
      date: day.date_start,
      spend: parseFloat(day.spend || 0),
      currency: "SAR",
      impressions: parseInt(day.impressions || 0),
      clicks: parseInt(day.clicks || 0),
      conversions:
        day.actions?.find((a: any) => a.action_type === "purchase")?.value || 0,
    }));
  } catch (error) {
    console.error("[Sync] Meta ad spend fetch error:", error);
    return [];
  }
}

async function fetchMetaCampaigns(
  accessToken: string,
  accountId: string
): Promise<CampaignData[]> {
  try {
    const response = await fetch(
      `${META_API_BASE}/act_${accountId}/campaigns?` +
        new URLSearchParams({
          access_token: accessToken,
          fields: "id,name,status,insights{spend,actions}",
        }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((c: any) => ({
      externalId: c.id,
      name: c.name,
      status: mapCampaignStatus(c.status),
      spend: parseFloat(c.insights?.data?.[0]?.spend || 0),
      revenue: 0,
      roas: 0,
      cpa: 0,
    }));
  } catch (error) {
    console.error("[Sync] Meta campaigns fetch error:", error);
    return [];
  }
}

// Google API helpers
async function fetchGoogleAdSpend(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  // Google Ads API requires special authentication and GAQL queries
  // This is a simplified implementation
  try {
    console.log(`[Sync] Google ad spend sync not fully implemented`);
    return [];
  } catch (error) {
    console.error("[Sync] Google ad spend fetch error:", error);
    return [];
  }
}

async function fetchGoogleCampaigns(
  accessToken: string,
  accountId: string
): Promise<CampaignData[]> {
  try {
    console.log(`[Sync] Google campaigns sync not fully implemented`);
    return [];
  } catch (error) {
    console.error("[Sync] Google campaigns fetch error:", error);
    return [];
  }
}

// TikTok API helpers
async function fetchTikTokAdSpend(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  try {
    const response = await fetch(
      `${TIKTOK_API_BASE}/report/integrated/get/?` +
        new URLSearchParams({
          advertiser_id: accountId,
          report_type: "BASIC",
          data_level: "AUCTION_ADVERTISER",
          dimensions: '["stat_time_day"]',
          metrics: '["spend","impressions","clicks","conversion"]',
          start_date: startDate.replace(/-/g, ""),
          end_date: endDate.replace(/-/g, ""),
        }),
      {
        headers: {
          "Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data?.list || []).map((day: any) => ({
      date: day.dimensions.stat_time_day,
      spend: parseFloat(day.metrics.spend || 0),
      currency: "SAR",
      impressions: parseInt(day.metrics.impressions || 0),
      clicks: parseInt(day.metrics.clicks || 0),
      conversions: parseInt(day.metrics.conversion || 0),
    }));
  } catch (error) {
    console.error("[Sync] TikTok ad spend fetch error:", error);
    return [];
  }
}

async function fetchTikTokCampaigns(
  accessToken: string,
  accountId: string
): Promise<CampaignData[]> {
  try {
    const response = await fetch(
      `${TIKTOK_API_BASE}/campaign/get/?` +
        new URLSearchParams({
          advertiser_id: accountId,
        }),
      {
        headers: {
          "Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data?.list || []).map((c: any) => ({
      externalId: c.campaign_id,
      name: c.campaign_name,
      status: mapCampaignStatus(c.operation_status),
      spend: 0,
      revenue: 0,
      roas: 0,
      cpa: 0,
    }));
  } catch (error) {
    console.error("[Sync] TikTok campaigns fetch error:", error);
    return [];
  }
}

// Salla API helpers
async function fetchOrdersFromSalla(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const fromDate = startDate.toISOString().split("T")[0];
    const toDate = endDate.toISOString().split("T")[0];

    const response = await fetch(
      `${SALLA_API_BASE}/admin/v2/orders?from_date=${fromDate}&to_date=${toDate}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[Sync] Salla orders fetch error:", error);
    return [];
  }
}

// Helper to map campaign status
function mapCampaignStatus(
  status: string
): "Active" | "Paused" | "Learning" | "Inactive" {
  const normalizedStatus = status?.toUpperCase() || "";
  switch (normalizedStatus) {
    case "ACTIVE":
    case "ENABLE":
    case "OPERATION_STATUS_ENABLE":
      return "Active";
    case "PAUSED":
    case "DISABLE":
    case "OPERATION_STATUS_DISABLE":
      return "Paused";
    case "LEARNING":
      return "Learning";
    default:
      return "Inactive";
  }
}
