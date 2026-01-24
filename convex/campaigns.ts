import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, getOptionalAuthContext } from "./lib/auth";

const platformValidator = v.union(
  v.literal("Meta"),
  v.literal("Google"),
  v.literal("TikTok"),
  v.literal("Snapchat"),
  v.literal("X"),
  v.literal("Klaviyo")
);

const statusValidator = v.union(
  v.literal("Active"),
  v.literal("Paused"),
  v.literal("Learning"),
  v.literal("Inactive")
);

export const list = query({
  args: {
    platform: v.optional(platformValidator),
    status: v.optional(statusValidator),
    searchTerm: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return empty result if not authenticated or no organization selected
    if (!authContext) {
      return {
        campaigns: [],
        total: 0,
        hasMore: false,
      };
    }

    const { organizationId } = authContext;

    let campaigns;

    // Use organization index, then filter by platform or status
    if (args.platform) {
      campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_organization_platform", (q) =>
          q.eq("organizationId", organizationId).eq("platform", args.platform!)
        )
        .collect();
    } else {
      campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .collect();
    }

    // Apply additional filters in memory
    if (args.status) {
      campaigns = campaigns.filter((c) => c.status === args.status);
    }

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      campaigns = campaigns.filter((c) => c.name.toLowerCase().includes(term));
    }

    // Sort by spend (highest first) for better UX
    campaigns.sort((a, b) => b.spend - a.spend);

    // Get total before pagination
    const total = campaigns.length;

    // Apply pagination
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    const paginated = campaigns.slice(offset, offset + limit);

    return {
      campaigns: paginated,
      total,
      hasMore: offset + limit < total,
    };
  },
});

// Legacy list without pagination (for sync operations)
export const listAll = query({
  args: {
    platform: v.optional(platformValidator),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    if (args.platform) {
      return await ctx.db
        .query("campaigns")
        .withIndex("by_organization_platform", (q) =>
          q.eq("organizationId", organizationId).eq("platform", args.platform!)
        )
        .collect();
    }
    return await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("campaigns"), clerkOrgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const campaign = await ctx.db.get(args.id);

    // Verify campaign belongs to current organization
    if (!campaign || campaign.organizationId !== organizationId) {
      return null;
    }

    return campaign;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    platform: platformValidator,
    status: statusValidator,
    spend: v.number(),
    revenue: v.number(),
    roas: v.number(),
    cpa: v.number(),
    externalId: v.optional(v.string()),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    return await ctx.db.insert("campaigns", {
      organizationId,
      ...args,
      lastSyncAt: Date.now(),
    });
  },
});

// Create campaign with explicit organizationId (for sync operations)
export const createForOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    platform: platformValidator,
    status: statusValidator,
    spend: v.number(),
    revenue: v.number(),
    roas: v.number(),
    cpa: v.number(),
    externalId: v.optional(v.string()),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", {
      ...args,
      lastSyncAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    platform: v.optional(platformValidator),
    status: v.optional(statusValidator),
    spend: v.optional(v.number()),
    revenue: v.optional(v.number()),
    roas: v.optional(v.number()),
    cpa: v.optional(v.number()),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const campaign = await ctx.db.get(args.id);

    // Verify campaign belongs to current organization
    if (!campaign || campaign.organizationId !== organizationId) {
      throw new Error("Campaign not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      lastSyncAt: Date.now(),
    });
  },
});

export const getByExternalId = query({
  args: {
    externalId: v.string(),
    platform: platformValidator,
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    return await ctx.db
      .query("campaigns")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .filter((q) =>
        q.and(
          q.eq(q.field("platform"), args.platform),
          q.eq(q.field("organizationId"), organizationId)
        )
      )
      .first();
  },
});

// Get by external ID with explicit organizationId (for sync operations)
export const getByExternalIdForOrg = query({
  args: {
    organizationId: v.id("organizations"),
    externalId: v.string(),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .filter((q) =>
        q.and(
          q.eq(q.field("platform"), args.platform),
          q.eq(q.field("organizationId"), args.organizationId)
        )
      )
      .first();
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns"), clerkOrgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const campaign = await ctx.db.get(args.id);

    // Verify campaign belongs to current organization
    if (!campaign || campaign.organizationId !== organizationId) {
      throw new Error("Campaign not found");
    }

    await ctx.db.delete(args.id);
  },
});
