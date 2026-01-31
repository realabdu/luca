import { NextRequest, NextResponse } from "next/server";
import {
  IntegrationPlatform,
} from "@/types/integrations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const VALID_PLATFORMS: IntegrationPlatform[] = [
  "salla",
  "shopify",
  "meta",
  "google",
  "tiktok",
  "snapchat",
];

/**
 * GET /api/auth/[platform]/callback
 * Proxies OAuth callback to Django and redirects to frontend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  // Validate platform
  if (!VALID_PLATFORMS.includes(platform as IntegrationPlatform)) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Invalid+platform`);
  }

  try {
    // Forward the callback to Django
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const djangoUrl = `${API_BASE_URL}/api/v1/integrations/${platform}/callback/?${queryString}`;

    const response = await fetch(djangoUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || "OAuth failed";
      return NextResponse.redirect(
        `${APP_URL}/integrations?error=${encodeURIComponent(errorMessage)}`
      );
    }

    // Success - redirect to integrations page
    return NextResponse.redirect(
      `${APP_URL}/integrations?connected=${platform}`
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=${encodeURIComponent("OAuth callback failed")}`
    );
  }
}
