import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, requireAdmin } from "./lib/auth";

/**
 * Create a new API key (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    permissions: v.array(v.string()),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireAdmin(ctx, args.clerkOrgId);

    return await ctx.db.insert("apiKeys", {
      organizationId,
      name: args.name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      permissions: args.permissions,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

/**
 * List API keys for the current organization
 */
export const list = query({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Return keys without the hash
    return keys.map((key) => ({
      _id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    }));
  },
});

/**
 * Validate an API key by hash
 * Used by the API key auth middleware
 */
export const validateKey = query({
  args: {
    keyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();

    if (!apiKey) {
      return null;
    }

    return {
      organizationId: apiKey.organizationId,
      permissions: apiKey.permissions,
      revokedAt: apiKey.revokedAt,
    };
  },
});

/**
 * Update last used timestamp for an API key
 */
export const updateLastUsed = mutation({
  args: {
    keyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();

    if (apiKey) {
      await ctx.db.patch(apiKey._id, {
        lastUsedAt: Date.now(),
      });
    }
  },
});

/**
 * Revoke an API key (admin only)
 */
export const revoke = mutation({
  args: {
    keyId: v.id("apiKeys"),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAdmin(ctx, args.clerkOrgId);

    const apiKey = await ctx.db.get(args.keyId);

    if (!apiKey || apiKey.organizationId !== organizationId) {
      throw new Error("API key not found");
    }

    await ctx.db.patch(args.keyId, {
      revokedAt: Date.now(),
    });
  },
});

/**
 * Delete an API key (admin only)
 */
export const remove = mutation({
  args: {
    keyId: v.id("apiKeys"),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAdmin(ctx, args.clerkOrgId);

    const apiKey = await ctx.db.get(args.keyId);

    if (!apiKey || apiKey.organizationId !== organizationId) {
      throw new Error("API key not found");
    }

    await ctx.db.delete(args.keyId);
  },
});

/**
 * Get available permissions for API keys
 */
export const getAvailablePermissions = query({
  args: {},
  handler: async () => {
    return [
      { id: "pixel:write", name: "Pixel Events", description: "Send pixel tracking events" },
      { id: "pixel:read", name: "Read Pixel Data", description: "Read pixel event data" },
      { id: "webhook:receive", name: "Receive Webhooks", description: "Receive webhook events" },
      { id: "data:read", name: "Read Data", description: "Read dashboard and analytics data" },
    ];
  },
});
