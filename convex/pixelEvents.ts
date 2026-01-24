import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./lib/auth";

/**
 * Create a new pixel event (called from API with explicit organizationId)
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    storeId: v.string(),
    eventType: v.string(),
    timestamp: v.number(),

    // Session data
    sessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
    sessionPageViews: v.optional(v.number()),

    // Attribution data
    platform: v.optional(v.string()),
    clickId: v.optional(v.string()),
    clickTimestamp: v.optional(v.number()),
    landingPage: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    attributionMethod: v.optional(v.string()),

    // Page data
    pageUrl: v.optional(v.string()),
    pagePath: v.optional(v.string()),
    pageReferrer: v.optional(v.string()),
    pageTitle: v.optional(v.string()),

    // Event data
    eventData: v.optional(v.any()),

    // Purchase event data
    orderId: v.optional(v.string()),
    orderValue: v.optional(v.number()),
    customerEmail: v.optional(v.string()),
    isNewCustomer: v.optional(v.boolean()),

    // Metadata
    pixelVersion: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create the pixel event
    const eventId = await ctx.db.insert("pixelEvents", {
      ...args,
      attributionStatus: args.eventType === "purchase" ? "pending" : undefined,
    });

    // If this has a click ID, also upsert the click tracking record
    if (args.clickId && args.platform) {
      // Check if click tracking record exists
      const existingClick = await ctx.db
        .query("clickTracking")
        .withIndex("by_click_id", (q) => q.eq("clickId", args.clickId!))
        .first();

      if (!existingClick) {
        // Create new click tracking record
        await ctx.db.insert("clickTracking", {
          organizationId: args.organizationId,
          storeId: args.storeId,
          platform: args.platform,
          clickId: args.clickId,
          timestamp: args.clickTimestamp || args.timestamp,
          landingPage: args.landingPage || args.pagePath || "/",
          referrer: args.pageReferrer,
          utmSource: args.utmSource,
          utmMedium: args.utmMedium,
          utmCampaign: args.utmCampaign,
          sessionId: args.sessionId,
          converted: false,
          userAgent: args.userAgent,
          ipAddress: args.ipAddress,
        });
      }
    }

    return eventId;
  },
});

/**
 * Get recent pixel events for the current organization
 */
export const getRecentEvents = query({
  args: {
    storeId: v.optional(v.string()),
    limit: v.optional(v.number()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const events = await ctx.db
      .query("pixelEvents")
      .withIndex("by_organization_timestamp", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(args.limit || 50);

    // Filter by store if specified
    if (args.storeId) {
      return events.filter((e) => e.storeId === args.storeId);
    }

    return events;
  },
});

/**
 * Get purchase events pending attribution for the current organization
 */
export const getPendingAttributions = query({
  args: {
    storeId: v.optional(v.string()),
    limit: v.optional(v.number()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    let events = await ctx.db
      .query("pixelEvents")
      .withIndex("by_attribution_status", (q) =>
        q.eq("attributionStatus", "pending")
      )
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .take(args.limit || 100);

    // Filter by store if specified
    if (args.storeId) {
      return events.filter((e) => e.storeId === args.storeId);
    }

    return events;
  },
});

/**
 * Update attribution status for a pixel event
 */
export const updateAttributionStatus = mutation({
  args: {
    eventId: v.id("pixelEvents"),
    status: v.union(v.literal("matched"), v.literal("unmatched")),
    matchedOrderId: v.optional(v.string()),
    matchConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      attributionStatus: args.status,
      matchedOrderId: args.matchedOrderId,
      matchConfidence: args.matchConfidence,
    });
  },
});

/**
 * Get clicks within an attribution window (for matching)
 */
export const getClicksInWindow = query({
  args: {
    organizationId: v.id("organizations"),
    storeId: v.string(),
    platform: v.optional(v.string()),
    windowStart: v.number(), // Timestamp
    windowEnd: v.number(), // Timestamp
    convertedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let clicks = await ctx.db
      .query("clickTracking")
      .withIndex("by_organization_timestamp", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("storeId"), args.storeId))
      .collect();

    // Filter by time window
    clicks = clicks.filter(
      (c) => c.timestamp >= args.windowStart && c.timestamp <= args.windowEnd
    );

    // Filter by platform if specified
    if (args.platform) {
      clicks = clicks.filter((c) => c.platform === args.platform);
    }

    // Filter by conversion status if specified
    if (args.convertedOnly !== undefined) {
      clicks = clicks.filter((c) => c.converted === args.convertedOnly);
    }

    return clicks;
  },
});

/**
 * Mark a click as converted (attributed to a purchase)
 */
export const markClickConverted = mutation({
  args: {
    clickId: v.string(),
    orderId: v.string(),
    conversionTimestamp: v.number(),
    conversionValue: v.number(),
  },
  handler: async (ctx, args) => {
    const click = await ctx.db
      .query("clickTracking")
      .withIndex("by_click_id", (q) => q.eq("clickId", args.clickId))
      .first();

    if (click) {
      await ctx.db.patch(click._id, {
        converted: true,
        conversionOrderId: args.orderId,
        conversionTimestamp: args.conversionTimestamp,
        conversionValue: args.conversionValue,
      });
    }

    return click?._id;
  },
});

/**
 * Get attribution statistics for the current organization
 */
export const getAttributionStats = query({
  args: {
    storeId: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    // Get all purchase events in the date range
    let events = await ctx.db
      .query("pixelEvents")
      .withIndex("by_organization_timestamp", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    // Filter by store if specified
    if (args.storeId) {
      events = events.filter((e) => e.storeId === args.storeId);
    }

    const purchaseEvents = events.filter(
      (e) =>
        e.eventType === "purchase" &&
        e.timestamp >= args.startDate &&
        e.timestamp <= args.endDate
    );

    // Group by platform
    const byPlatform: Record<string, { count: number; value: number }> = {};

    for (const event of purchaseEvents) {
      const platform = event.platform || "unknown";
      if (!byPlatform[platform]) {
        byPlatform[platform] = { count: 0, value: 0 };
      }
      byPlatform[platform].count++;
      byPlatform[platform].value += event.orderValue || 0;
    }

    // Count by attribution status
    const matched = purchaseEvents.filter(
      (e) => e.attributionStatus === "matched"
    ).length;
    const pending = purchaseEvents.filter(
      (e) => e.attributionStatus === "pending"
    ).length;
    const unmatched = purchaseEvents.filter(
      (e) => e.attributionStatus === "unmatched"
    ).length;

    return {
      totalPurchases: purchaseEvents.length,
      matched,
      pending,
      unmatched,
      byPlatform,
      matchRate:
        purchaseEvents.length > 0 ? (matched / purchaseEvents.length) * 100 : 0,
    };
  },
});
