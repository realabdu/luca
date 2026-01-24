import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);

    // Create/update user in Convex
    await client.mutation(api.users.upsertFromClerk, {
      clerkId: userId,
      email: user.emailAddresses[0]?.emailAddress || "",
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      avatarUrl: user.imageUrl || undefined,
    });

    // If user has an org, sync that too
    if (orgId) {
      // Try to get org details from Clerk
      const orgResponse = await fetch(`https://api.clerk.com/v1/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });

      if (orgResponse.ok) {
        const org = await orgResponse.json();

        // Create organization in Convex
        try {
          await client.mutation(api.organizations.createFromClerk, {
            clerkOrgId: orgId,
            name: org.name,
            slug: org.slug,
            createdByClerkId: userId,
          });
        } catch (e) {
          // Org might already exist, try to update membership
          console.log("Org might exist, trying membership sync");
        }

        // Create membership
        try {
          await client.mutation(api.organizations.createMembership, {
            clerkOrgId: orgId,
            clerkUserId: userId,
            role: "admin", // Assume admin for now
          });
        } catch (e) {
          console.log("Membership might exist:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      orgId,
      email: user.emailAddresses[0]?.emailAddress,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
