import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  IntegrationPlatform,
} from "@/types/integrations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VALID_PLATFORMS: IntegrationPlatform[] = [
  "salla",
  "shopify",
  "meta",
  "google",
  "tiktok",
  "snapchat",
];

/**
 * GET /api/auth/[platform]
 * Fetches OAuth URL from Django (with auth) and redirects user to it
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

  // Get authenticated user from Clerk
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Build Django OAuth URL
  let djangoUrl = `${API_BASE_URL}/api/v1/integrations/${platform}/connect/`;

  // Handle Shopify's per-store URL
  if (platform === "shopify") {
    const shopDomain = request.nextUrl.searchParams.get("shop");
    if (!shopDomain) {
      return NextResponse.json(
        { error: "Missing shop parameter. Use ?shop=your-store.myshopify.com" },
        { status: 400 }
      );
    }
    djangoUrl += `?shop=${encodeURIComponent(shopDomain)}`;
  }

  // Fetch OAuth URL from Django with authentication
  const response = await fetch(djangoUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to initiate OAuth" }));
    return NextResponse.json(
      { error: error.message || "Failed to initiate OAuth" },
      { status: response.status }
    );
  }

  const data = await response.json();

  // Django should return an authorization_url to redirect to
  if (data.authorization_url) {
    return NextResponse.redirect(data.authorization_url);
  }

  return NextResponse.json(
    { error: "No authorization URL returned" },
    { status: 500 }
  );
}
