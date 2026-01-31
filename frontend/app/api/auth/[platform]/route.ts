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
 * Redirects to Django OAuth initiation endpoint
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

  // Redirect to Django OAuth endpoint
  // Django will handle the OAuth state and redirect to the provider
  return NextResponse.redirect(djangoUrl);
}
