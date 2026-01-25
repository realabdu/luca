import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, getOptionalAuthContext } from "./lib/auth";
import { Id } from "./_generated/dataModel";

const platformValidator = v.union(
  v.literal("salla"),
  v.literal("shopify"),
  v.literal("meta"),
  v.literal("google"),
  v.literal("tiktok"),
  v.literal("snapchat")
);

/**
 * Get all integrations for the current organization
 */
export const list = query({
  args: {
    clerkOrgId: v.optional(v.string()), // Optional: pass Clerk org ID to lookup
  },
  handler: async (ctx, args) => {
    let organizationId: Id<"organizations"> | null = null;

    // First try to get auth context
    const authContext = await getOptionalAuthContext(ctx);

    if (authContext) {
      organizationId = authContext.organizationId;
      console.log("[Integrations.list] Got organizationId from auth context:", organizationId);
    } else if (args.clerkOrgId) {
      // Fallback: lookup organization by Clerk org ID
      console.log("[Integrations.list] Looking up org by clerkOrgId:", args.clerkOrgId);
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
        .first();

      if (org) {
        organizationId = org._id;
        console.log("[Integrations.list] Found org:", organizationId);
      }
    }

    // Return empty array if no organization found
    if (!organizationId) {
      console.log("[Integrations.list] No organization found - returning empty array");
      return [];
    }

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Return integration status (without exposing tokens)
    return integrations.map((integration) => ({
      _id: integration._id,
      platform: integration.platform,
      accountId: integration.accountId,
      accountName: integration.accountName,
      isConnected: integration.isConnected,
      lastSyncAt: integration.lastSyncAt,
      metadata: integration.metadata,
      // Token health indicator
      tokenExpiresSoon:
        integration.expiresAt && integration.expiresAt < Date.now() + 24 * 60 * 60 * 1000,
      tokenExpired: integration.expiresAt && integration.expiresAt < Date.now(),
    }));
  },
});

/**
 * Get integration by platform for the current organization
 */
export const getByPlatform = query({
  args: {
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return null if not authenticated or no organization selected
    if (!authContext) {
      return null;
    }

    const { organizationId } = authContext;

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", args.platform)
      )
      .first();

    if (!integration) return null;

    return {
      _id: integration._id,
      platform: integration.platform,
      accountId: integration.accountId,
      accountName: integration.accountName,
      isConnected: integration.isConnected,
      lastSyncAt: integration.lastSyncAt,
      metadata: integration.metadata,
      tokenExpiresSoon:
        integration.expiresAt && integration.expiresAt < Date.now() + 24 * 60 * 60 * 1000,
      tokenExpired: integration.expiresAt && integration.expiresAt < Date.now(),
    };
  },
});

/**
 * Get connected integrations only for the current organization
 */
export const getConnected = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return empty array if not authenticated or no organization selected
    if (!authContext) {
      return [];
    }

    const { organizationId } = authContext;

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    return integrations.map((integration) => ({
      _id: integration._id,
      platform: integration.platform,
      accountId: integration.accountId,
      accountName: integration.accountName,
      lastSyncAt: integration.lastSyncAt,
    }));
  },
});

/**
 * Create or update an integration (upsert) for the current organization
 */
export const upsertIntegration = mutation({
  args: {
    organizationId: v.id("organizations"),
    platform: platformValidator,
    accessToken: v.string(), // Should be encrypted before calling
    refreshToken: v.optional(v.string()), // Should be encrypted before calling
    expiresAt: v.optional(v.number()),
    accountId: v.string(),
    accountName: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if integration already exists for this org and platform
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", args.organizationId).eq("platform", args.platform)
      )
      .first();

    if (existing) {
      // Update existing integration
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        accountId: args.accountId,
        accountName: args.accountName,
        isConnected: true,
        lastSyncAt: Date.now(),
        metadata: args.metadata,
      });
      return existing._id;
    }

    // Create new integration
    return await ctx.db.insert("integrations", {
      organizationId: args.organizationId,
      platform: args.platform,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      accountId: args.accountId,
      accountName: args.accountName,
      isConnected: true,
      lastSyncAt: Date.now(),
      metadata: args.metadata,
    });
  },
});

/**
 * Update integration tokens (for token refresh)
 */
export const updateTokens = mutation({
  args: {
    organizationId: v.id("organizations"),
    platform: platformValidator,
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", args.organizationId).eq("platform", args.platform)
      )
      .first();

    if (!integration) {
      throw new Error(`Integration not found: ${args.platform}`);
    }

    await ctx.db.patch(integration._id, {
      accessToken: args.accessToken,
      ...(args.refreshToken && { refreshToken: args.refreshToken }),
      ...(args.expiresAt && { expiresAt: args.expiresAt }),
    });
  },
});

/**
 * Update last sync time
 */
export const updateLastSync = mutation({
  args: {
    platform: platformValidator,
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", args.platform)
      )
      .first();

    if (integration) {
      await ctx.db.patch(integration._id, {
        lastSyncAt: Date.now(),
      });
    }
  },
});

/**
 * Disconnect an integration
 */
export const disconnect = mutation({
  args: {
    platform: platformValidator,
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", args.platform)
      )
      .first();

    if (!integration) {
      throw new Error(`Integration not found: ${args.platform}`);
    }

    // Mark as disconnected but keep the record
    await ctx.db.patch(integration._id, {
      isConnected: false,
      accessToken: "", // Clear tokens
      refreshToken: undefined,
      expiresAt: undefined,
    });
  },
});

/**
 * Delete an integration completely
 */
export const remove = mutation({
  args: {
    platform: platformValidator,
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", args.platform)
      )
      .first();

    if (integration) {
      // Also delete related sync logs
      const syncLogs = await ctx.db
        .query("syncLogs")
        .withIndex("by_integration", (q) => q.eq("integrationId", integration._id))
        .collect();

      for (const log of syncLogs) {
        await ctx.db.delete(log._id);
      }

      await ctx.db.delete(integration._id);
    }
  },
});

/**
 * Get integration credentials (internal use only - for sync operations)
 * Returns encrypted tokens that need to be decrypted before use
 */
export const getCredentials = query({
  args: {
    organizationId: v.id("organizations"),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", args.organizationId).eq("platform", args.platform)
      )
      .first();

    if (!integration || !integration.isConnected) {
      return null;
    }

    return {
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      expiresAt: integration.expiresAt,
      accountId: integration.accountId,
    };
  },
});

/**
 * Get integration by account ID (for webhook routing)
 * Used by Salla webhooks to find the correct organization
 */
export const getByAccountId = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_account_id", (q) => q.eq("accountId", args.accountId))
      .first();

    if (!integration) return null;

    return {
      _id: integration._id,
      organizationId: integration.organizationId,
      platform: integration.platform,
      accountId: integration.accountId,
      accountName: integration.accountName,
      isConnected: integration.isConnected,
    };
  },
});

// ========== Sync Logs ==========

/**
 * Create a sync log entry
 */
export const createSyncLog = mutation({
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
      organizationId: args.organizationId,
      integrationId: args.integrationId,
      syncType: args.syncType,
      status: "in_progress",
      recordsProcessed: 0,
      startedAt: Date.now(),
    });
  },
});

/**
 * Update sync log with completion status
 */
export const completeSyncLog = mutation({
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

/**
 * Get recent sync logs for an integration
 */
export const getSyncLogs = query({
  args: {
    platform: platformValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return empty array if not authenticated or no organization selected
    if (!authContext) {
      return [];
    }

    const { organizationId } = authContext;

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", args.platform)
      )
      .first();

    if (!integration) return [];

    const logs = await ctx.db
      .query("syncLogs")
      .withIndex("by_integration", (q) => q.eq("integrationId", integration._id))
      .order("desc")
      .take(args.limit ?? 10);

    return logs;
  },
});
