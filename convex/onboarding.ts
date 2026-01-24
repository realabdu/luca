import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext, getOptionalAuthContext } from "./lib/auth";

/**
 * Onboarding status type
 */
export type OnboardingStatus = "pending" | "store_connected" | "ads_connected" | "completed";

/**
 * Get the onboarding status for the current organization
 */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    if (!authContext) {
      return null;
    }

    const { organizationId } = authContext;

    // Get organization
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      return null;
    }

    // Get all integrations for this organization
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    // Check which platforms are connected
    const storeConnected = integrations.some((i) => i.platform === "salla");
    const adsConnected = integrations.some((i) =>
      ["meta", "google", "tiktok", "snapchat"].includes(i.platform)
    );
    const connectedAdsPlatforms = integrations
      .filter((i) => ["meta", "google", "tiktok", "snapchat"].includes(i.platform))
      .map((i) => i.platform);

    // Calculate current step
    let currentStep = 1;
    if (storeConnected) currentStep = 2;
    if (storeConnected && adsConnected) currentStep = 3;

    return {
      status: organization.onboardingStatus || "pending",
      storeConnected,
      adsConnected,
      connectedAdsPlatforms,
      completedSteps: currentStep - 1,
      totalSteps: 2,
      currentStep,
      onboardingCompletedAt: organization.onboardingCompletedAt,
    };
  },
});

/**
 * Check if the current organization needs onboarding
 * This is used to decide whether to redirect to /onboarding
 */
export const needsOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    if (!authContext) {
      return false; // Not authenticated, can't determine onboarding need
    }

    const { organizationId } = authContext;

    // Get organization
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      return false;
    }

    // If already completed, no need for onboarding
    if (organization.onboardingStatus === "completed") {
      return false;
    }

    // Check if at least the store is connected
    const storeIntegration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", "salla")
      )
      .first();

    // Need onboarding if no store is connected
    return !storeIntegration?.isConnected;
  },
});

/**
 * Update the onboarding status based on current integrations
 * This should be called after any integration connect/disconnect
 * Used from API routes when organizationId is available from OAuth state
 */
export const updateStatus = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get all connected integrations
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    const storeConnected = integrations.some((i) => i.platform === "salla");
    const adsConnected = integrations.some((i) =>
      ["meta", "google", "tiktok", "snapchat"].includes(i.platform)
    );

    // Determine new status
    let newStatus: OnboardingStatus = "pending";
    if (storeConnected && adsConnected) {
      newStatus = "completed";
    } else if (adsConnected) {
      newStatus = "ads_connected";
    } else if (storeConnected) {
      newStatus = "store_connected";
    }

    // Only update if status changed
    if (organization.onboardingStatus !== newStatus) {
      await ctx.db.patch(args.organizationId, {
        onboardingStatus: newStatus,
        ...(newStatus === "completed" && !organization.onboardingCompletedAt
          ? { onboardingCompletedAt: Date.now() }
          : {}),
        updatedAt: Date.now(),
      });
    }

    return newStatus;
  },
});

/**
 * Refresh the onboarding status using auth context
 * Used from UI components after integration changes
 */
export const refreshStatus = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get all connected integrations
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    const storeConnected = integrations.some((i) => i.platform === "salla");
    const adsConnected = integrations.some((i) =>
      ["meta", "google", "tiktok", "snapchat"].includes(i.platform)
    );

    // Determine new status
    let newStatus: OnboardingStatus = "pending";
    if (storeConnected && adsConnected) {
      newStatus = "completed";
    } else if (adsConnected) {
      newStatus = "ads_connected";
    } else if (storeConnected) {
      newStatus = "store_connected";
    }

    // Only update if status changed
    if (organization.onboardingStatus !== newStatus) {
      await ctx.db.patch(organizationId, {
        onboardingStatus: newStatus,
        ...(newStatus === "completed" && !organization.onboardingCompletedAt
          ? { onboardingCompletedAt: Date.now() }
          : {}),
        updatedAt: Date.now(),
      });
    }

    return newStatus;
  },
});

/**
 * Mark onboarding as complete (manual override)
 * This allows users to skip ads connection if needed
 */
export const complete = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check if at least store is connected
    const storeIntegration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", "salla")
      )
      .first();

    if (!storeIntegration?.isConnected) {
      throw new Error("Cannot complete onboarding without a connected store");
    }

    await ctx.db.patch(organizationId, {
      onboardingStatus: "completed",
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Skip ads connection in onboarding (with warning)
 * Marks onboarding as complete even without ads platform
 */
export const skipAdsStep = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check if store is connected
    const storeIntegration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_platform", (q) =>
        q.eq("organizationId", organizationId).eq("platform", "salla")
      )
      .first();

    if (!storeIntegration?.isConnected) {
      throw new Error("Cannot skip ads step before connecting a store");
    }

    await ctx.db.patch(organizationId, {
      onboardingStatus: "completed",
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, skippedAds: true };
  },
});

/**
 * Reset onboarding status (for testing or re-onboarding)
 */
export const reset = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, role } = await getAuthContext(ctx, args.clerkOrgId);

    if (role !== "admin") {
      throw new Error("Admin access required to reset onboarding");
    }

    await ctx.db.patch(organizationId, {
      onboardingStatus: "pending",
      onboardingCompletedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get integration connection health for dashboard
 * Returns status of all expected integrations
 */
export const getConnectionHealth = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    if (!authContext) {
      return null;
    }

    const { organizationId } = authContext;

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const platforms = ["salla", "snapchat", "meta", "google", "tiktok"] as const;

    const health: Record<string, {
      connected: boolean;
      tokenExpired: boolean;
      tokenExpiresSoon: boolean;
      lastSyncAt: number | undefined;
      accountName: string | undefined;
    }> = {};

    for (const platform of platforms) {
      const integration = integrations.find((i) => i.platform === platform);
      if (integration) {
        health[platform] = {
          connected: integration.isConnected,
          tokenExpired: integration.expiresAt ? integration.expiresAt < Date.now() : false,
          tokenExpiresSoon: integration.expiresAt
            ? integration.expiresAt < Date.now() + 24 * 60 * 60 * 1000
            : false,
          lastSyncAt: integration.lastSyncAt,
          accountName: integration.accountName,
        };
      } else {
        health[platform] = {
          connected: false,
          tokenExpired: false,
          tokenExpiresSoon: false,
          lastSyncAt: undefined,
          accountName: undefined,
        };
      }
    }

    return health;
  },
});
