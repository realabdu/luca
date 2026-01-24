import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create OAuth state for multi-tenant OAuth flow
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    platform: v.string(),
    state: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("oauthStates", args);
  },
});

/**
 * Get OAuth state by state string
 */
export const getByState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!oauthState) return null;

    // Check if expired
    if (oauthState.expiresAt < Date.now()) {
      return null;
    }

    return oauthState;
  },
});

/**
 * Delete OAuth state after use
 */
export const remove = mutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (oauthState) {
      await ctx.db.delete(oauthState._id);
    }
  },
});

/**
 * Clean up expired OAuth states
 */
export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredStates = await ctx.db
      .query("oauthStates")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const state of expiredStates) {
      await ctx.db.delete(state._id);
    }

    return expiredStates.length;
  },
});
