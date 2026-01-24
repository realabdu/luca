import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, getOptionalAuthContext } from "./lib/auth";

const sourceValidator = v.union(
  v.literal("Meta"),
  v.literal("Google"),
  v.literal("TikTok"),
  v.literal("Snapchat"),
  v.literal("X"),
  v.literal("Klaviyo"),
  v.literal("salla")
);

const eventTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("refund"),
  v.literal("add_to_cart"),
  v.literal("checkout"),
  v.literal("page_view")
);

export const list = query({
  args: {
    source: v.optional(
      v.union(
        v.literal("Meta"),
        v.literal("Google"),
        v.literal("TikTok"),
        v.literal("Snapchat"),
        v.literal("X"),
        v.literal("Klaviyo")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return empty array if not authenticated or no organization selected
    if (!authContext) {
      return [];
    }

    const { organizationId } = authContext;

    const limit = args.limit ?? 10;

    let events = await ctx.db
      .query("attributionEvents")
      .withIndex("by_organization_timestamp", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(limit * 2); // Get extra to filter by source

    // Filter by source if specified
    if (args.source) {
      events = events.filter((e) => e.source === args.source);
    }

    // Limit to requested amount
    events = events.slice(0, limit);

    // Add time labels based on timestamp
    return events.map((event) => {
      const now = Date.now();
      const diff = now - event.timestamp;
      const minutes = Math.floor(diff / 60000);

      let timeLabel: string;
      if (minutes < 1) {
        timeLabel = "Just now";
      } else if (minutes < 60) {
        timeLabel = `${minutes}m`;
      } else if (minutes < 1440) {
        timeLabel = `${Math.floor(minutes / 60)}h`;
      } else {
        timeLabel = `${Math.floor(minutes / 1440)}d`;
      }

      return {
        ...event,
        timeLabel,
      };
    });
  },
});

export const getRecentStats = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return default stats if not authenticated or no organization selected
    if (!authContext) {
      return {
        revenue: 0,
        orders: 0,
        roas: "0.0",
      };
    }

    const { organizationId } = authContext;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const recentEvents = await ctx.db
      .query("attributionEvents")
      .withIndex("by_organization_timestamp", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.gte(q.field("timestamp"), oneHourAgo))
      .collect();

    const totalRevenue = recentEvents.reduce((sum, e) => sum + e.amount, 0);
    const orderCount = recentEvents.length;

    // Calculate spend (simplified - in reality would come from ad platform data)
    const estimatedSpend = totalRevenue / 3.8; // Assuming 3.8x ROAS
    const roas = estimatedSpend > 0 ? totalRevenue / estimatedSpend : 0;

    return {
      revenue: totalRevenue,
      orders: orderCount,
      roas: roas.toFixed(1),
    };
  },
});

export const create = mutation({
  args: {
    amount: v.number(),
    source: v.union(
      v.literal("Meta"),
      v.literal("Google"),
      v.literal("TikTok"),
      v.literal("Snapchat"),
      v.literal("X"),
      v.literal("Klaviyo")
    ),
    campaign: v.string(),
    creativeUrl: v.string(),
    status: v.union(v.literal("Paid"), v.literal("Pending")),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    return await ctx.db.insert("attributionEvents", {
      organizationId,
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("attributionEvents"),
    status: v.union(v.literal("Paid"), v.literal("Pending")),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const event = await ctx.db.get(args.id);

    if (!event || event.organizationId !== organizationId) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Create an attribution event from webhook data (e.g., Salla orders)
 * Used by webhooks with explicit organizationId
 */
export const createAttributionEvent = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: eventTypeValidator,
    source: sourceValidator,
    eventId: v.string(),
    orderId: v.optional(v.string()),
    orderAmount: v.number(),
    currency: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerId: v.optional(v.string()),
    timestamp: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate event within the organization
    const existing = await ctx.db
      .query("attributionEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (existing) {
      console.log(`Duplicate event ignored: ${args.eventId}`);
      return existing._id;
    }

    return await ctx.db.insert("attributionEvents", {
      organizationId: args.organizationId,
      timestamp: args.timestamp || Date.now(),
      amount: args.orderAmount,
      source: args.source,
      status: "Paid",
      type: args.type,
      eventId: args.eventId,
      orderId: args.orderId,
      currency: args.currency,
      customerEmail: args.customerEmail,
      customerId: args.customerId,
      metadata: args.metadata,
    });
  },
});

/**
 * Update an attribution event by order ID
 */
export const updateAttributionEventByOrderId = mutation({
  args: {
    organizationId: v.id("organizations"),
    orderId: v.string(),
    source: sourceValidator,
    updates: v.object({
      status: v.optional(v.union(v.literal("Paid"), v.literal("Pending"))),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("attributionEvents")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .filter((q) =>
        q.and(
          q.eq(q.field("source"), args.source),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();

    if (!event) {
      console.log(`Event not found for order: ${args.orderId}`);
      return null;
    }

    const updateData: Record<string, unknown> = {};
    if (args.updates.status) {
      updateData.status = args.updates.status;
    }
    if (args.updates.metadata) {
      // Merge metadata
      updateData.metadata = {
        ...(event.metadata || {}),
        ...args.updates.metadata,
      };
    }

    await ctx.db.patch(event._id, updateData);
    return event._id;
  },
});
