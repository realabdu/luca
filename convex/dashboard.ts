import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./lib/auth";

export const getMetrics = query({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const metrics = await ctx.db
      .query("metrics")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    // Sort by order field
    return metrics.sort((a, b) => a.order - b.order);
  },
});

export const getPerformanceData = query({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const data = await ctx.db
      .query("performanceData")
      .withIndex("by_organization_date", (q) => q.eq("organizationId", organizationId))
      .collect();
    return data;
  },
});

export const getPlatformSpend = query({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const data = await ctx.db
      .query("platformSpend")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return data;
  },
});

export const updateMetric = mutation({
  args: {
    id: v.id("metrics"),
    value: v.optional(v.string()),
    trend: v.optional(v.number()),
    trendType: v.optional(
      v.union(v.literal("up"), v.literal("down"), v.literal("neutral"))
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
  },
});

export const addPerformanceData = mutation({
  args: {
    date: v.string(),
    revenue: v.number(),
    spend: v.number(),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    return await ctx.db.insert("performanceData", {
      ...args,
      organizationId,
    });
  },
});

export const updatePlatformSpend = mutation({
  args: {
    id: v.id("platformSpend"),
    percentage: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { percentage: args.percentage });
  },
});
