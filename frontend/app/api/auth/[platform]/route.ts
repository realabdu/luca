import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  IntegrationPlatform,
} from "@/types/integrations";

// Hardcode production API URL - env vars may not be available in Cloudflare edge runtime
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

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

  try {
    // Fetch OAuth URL from Django with authentication
    const response = await fetch(djangoUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to initiate OAuth";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.detail || errorMessage;
      } catch {
        // If not JSON, use the text if it's short enough
        if (errorText.length < 200) {
          errorMessage = errorText || errorMessage;
        }
      }
      return NextResponse.json(
        { error: errorMessage, status: response.status, url: djangoUrl },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Django should return an authorization_url to redirect to
    if (data.authorization_url) {
      return NextResponse.redirect(data.authorization_url);
    }

    return NextResponse.json(
      { error: "No authorization URL returned", data },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`, url: djangoUrl },
      { status: 500 }
    );
  }
}
