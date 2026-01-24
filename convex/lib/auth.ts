import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type AuthContext = {
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  role: "admin" | "member";
};

/**
 * Get authenticated user and organization context from Clerk session.
 * Throws if user is not authenticated or not a member of the organization.
 *
 * @param ctx - Convex query or mutation context
 * @param clerkOrgIdFallback - Optional fallback Clerk org ID if JWT doesn't include org_id claim
 */
export async function getAuthContext(
  ctx: QueryCtx | MutationCtx,
  clerkOrgIdFallback?: string
): Promise<AuthContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  // Get user by Clerk ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found in database");
  }

  // Get organization ID from Clerk session
  // Clerk stores orgId in the token claims when using organizations
  // Try JWT first, then fallback parameter
  let clerkOrgId = (identity as unknown as { org_id?: string }).org_id;
  if (!clerkOrgId && clerkOrgIdFallback) {
    clerkOrgId = clerkOrgIdFallback;
  }

  if (!clerkOrgId) {
    throw new Error("No organization selected");
  }

  // Get organization by Clerk organization ID
  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", clerkOrgId))
    .first();

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Verify membership
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", user._id).eq("organizationId", organization._id)
    )
    .first();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return {
    userId: user._id,
    organizationId: organization._id,
    role: membership.role,
  };
}

/**
 * Get authenticated user context without requiring an organization.
 * Useful for user-level operations like listing organizations.
 */
export async function getUserContext(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<"users">; clerkId: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found in database");
  }

  return {
    userId: user._id,
    clerkId: identity.subject,
  };
}

/**
 * Check if the authenticated user has admin role in the organization.
 *
 * @param ctx - Convex query or mutation context
 * @param clerkOrgIdFallback - Optional fallback Clerk org ID if JWT doesn't include org_id claim
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  clerkOrgIdFallback?: string
): Promise<AuthContext> {
  const authContext = await getAuthContext(ctx, clerkOrgIdFallback);

  if (authContext.role !== "admin") {
    throw new Error("Admin access required");
  }

  return authContext;
}

/**
 * Optional auth context - returns null if not authenticated.
 * Useful for public endpoints that behave differently for authenticated users.
 *
 * @param ctx - Convex query or mutation context
 * @param clerkOrgIdFallback - Optional fallback Clerk org ID if JWT doesn't include org_id claim
 */
export async function getOptionalAuthContext(
  ctx: QueryCtx | MutationCtx,
  clerkOrgIdFallback?: string
): Promise<AuthContext | null> {
  try {
    return await getAuthContext(ctx, clerkOrgIdFallback);
  } catch (error) {
    console.log("[getOptionalAuthContext] Failed:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
