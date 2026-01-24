import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthContext, getOptionalAuthContext, getUserContext, requireAdmin } from "./lib/auth";

/**
 * Create organization from Clerk webhook
 */
export const createFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    createdByClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if org already exists
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Ensure unique slug
    let slug = args.slug;
    let suffix = 0;
    while (true) {
      const slugTaken = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!slugTaken) break;
      suffix++;
      slug = `${args.slug}-${suffix}`;
    }

    const now = Date.now();
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      clerkOrgId: args.clerkOrgId,
      createdAt: now,
      updatedAt: now,
    });

    // Create membership for the creator (as admin)
    const creator = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.createdByClerkId))
      .first();

    if (creator) {
      await ctx.db.insert("memberships", {
        userId: creator._id,
        organizationId: orgId,
        role: "admin",
        createdAt: now,
      });
    }

    return orgId;
  },
});

/**
 * Update organization from Clerk webhook
 */
export const updateFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error("Organization not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name) updates.name = args.name;
    if (args.slug) {
      // Ensure unique slug if changed
      let slug = args.slug;
      let suffix = 0;
      while (true) {
        const slugTaken = await ctx.db
          .query("organizations")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!slugTaken || slugTaken._id === org._id) break;
        suffix++;
        slug = `${args.slug}-${suffix}`;
      }
      updates.slug = slug;
    }

    await ctx.db.patch(org._id, updates);
    return org._id;
  },
});

/**
 * Delete organization from Clerk webhook
 */
export const deleteFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return;

    // Delete all memberships
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete organization
    await ctx.db.delete(org._id);
  },
});

/**
 * Create membership from Clerk webhook
 */
export const createMembership = mutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error("Organization not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if membership already exists
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", org._id)
      )
      .first();

    if (existing) {
      // Update role if different
      if (existing.role !== args.role) {
        await ctx.db.patch(existing._id, { role: args.role });
      }
      return existing._id;
    }

    return await ctx.db.insert("memberships", {
      userId: user._id,
      organizationId: org._id,
      role: args.role,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update membership from Clerk webhook
 */
export const updateMembership = mutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error("Organization not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", org._id)
      )
      .first();

    if (!membership) {
      throw new Error("Membership not found");
    }

    await ctx.db.patch(membership._id, { role: args.role });
    return membership._id;
  },
});

/**
 * Delete membership from Clerk webhook
 */
export const deleteMembership = mutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!user) return;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", org._id)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }
  },
});

/**
 * Get current organization details
 */
export const getCurrent = query({
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return null if not authenticated or no organization selected
    if (!authContext) {
      return null;
    }

    const { organizationId } = authContext;
    return await ctx.db.get(organizationId);
  },
});

/**
 * Get organization members
 */
export const getMembers = query({
  handler: async (ctx) => {
    const authContext = await getOptionalAuthContext(ctx);

    // Return empty array if not authenticated or no organization selected
    if (!authContext) {
      return [];
    }

    const { organizationId } = authContext;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return user
          ? {
              ...user,
              role: membership.role,
              membershipId: membership._id,
              joinedAt: membership.createdAt,
            }
          : null;
      })
    );

    return members.filter(Boolean);
  },
});

/**
 * Update organization settings (admin only)
 */
export const updateSettings = mutation({
  args: {
    settings: v.object({
      timezone: v.optional(v.string()),
      currency: v.optional(v.string()),
      attributionWindow: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAdmin(ctx);

    await ctx.db.patch(organizationId, {
      settings: args.settings,
      updatedAt: Date.now(),
    });

    return organizationId;
  },
});

/**
 * Get organization by slug (for URL routing)
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get organization by Clerk organization ID
 */
export const getByClerkOrgId = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});
