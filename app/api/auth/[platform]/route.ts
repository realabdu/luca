import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import {
  buildOAuthUrl,
  OAUTH_CONFIGS,
  IntegrationPlatform,
} from "@/types/integrations";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

const VALID_PLATFORMS: IntegrationPlatform[] = [
  "salla",
  "meta",
  "google",
  "tiktok",
  "snapchat",
];

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

/**
 * GET /api/auth/[platform]
 * Initiates OAuth flow for the specified platform (multi-tenant)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  // Validate platform
  if (!VALID_PLATFORMS.includes(platform as IntegrationPlatform)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platform}` },
      { status: 400 }
    );
  }

  const platformKey = platform as IntegrationPlatform;
  const config = OAUTH_CONFIGS[platformKey];

  if (!config) {
    return NextResponse.json(
      { error: `OAuth not configured for platform: ${platform}` },
      { status: 400 }
    );
  }

  // Get authenticated user from Clerk
  const { userId: clerkUserId, orgId: clerkOrgId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!clerkOrgId) {
    return NextResponse.json(
      { error: "No organization selected" },
      { status: 400 }
    );
  }

  if (!client) {
    return NextResponse.json(
      { error: "Convex not configured" },
      { status: 500 }
    );
  }

  // Get user and organization from Convex
  const user = await client.query(api.users.getByClerkId, {
    clerkId: clerkUserId,
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found in database" },
      { status: 404 }
    );
  }

  const organization = await client.query(api.organizations.getBySlug, {
    slug: clerkOrgId, // Actually need to lookup by clerkOrgId
  });

  // Use a different query to get org by Clerk ID
  const org = await client.query(api.organizations.getByClerkOrgId, {
    clerkOrgId: clerkOrgId,
  });

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // Get client ID from environment
  const clientId = getClientId(platformKey);
  if (!clientId) {
    return NextResponse.json(
      { error: `Missing client ID for ${platform}` },
      { status: 500 }
    );
  }

  // Build redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/${platform}/callback`;

  // Generate state for CSRF protection
  const state = generateState();

  // Store state in Convex for verification (with organizationId)
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await client.mutation(api.oauthStates.create, {
    organizationId: org._id,
    userId: user._id,
    platform: platformKey,
    state: state,
    expiresAt: expiresAt,
  });

  // Also store state in cookie as backup
  const response = NextResponse.redirect(
    buildOAuthUrl(platformKey, clientId, redirectUri, state)
  );

  response.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}

function getClientId(platform: IntegrationPlatform): string | undefined {
  switch (platform) {
    case "salla":
      return process.env.SALLA_CLIENT_ID;
    case "meta":
      return process.env.META_APP_ID;
    case "google":
      return process.env.GOOGLE_CLIENT_ID;
    case "tiktok":
      return process.env.TIKTOK_APP_ID;
    case "snapchat":
      return process.env.SNAPCHAT_CLIENT_ID;
    default:
      return undefined;
  }
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
