import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  IntegrationPlatform,
  OAUTH_CONFIGS,
} from "@/types/integrations";
import { encryptAsync } from "@/lib/encryption";
import { ConvexHttpClient } from "convex/browser";

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
 * GET /api/auth/[platform]/callback
 * Handles OAuth callback and stores tokens (multi-tenant)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Validate platform
  if (!VALID_PLATFORMS.includes(platform as IntegrationPlatform)) {
    return redirectWithError("Invalid platform");
  }

  const platformKey = platform as IntegrationPlatform;

  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error for ${platform}:`, error, errorDescription);
    return redirectWithError(errorDescription || error);
  }

  // Validate code
  if (!code) {
    return redirectWithError("Missing authorization code");
  }

  // Validate state
  if (!state) {
    return redirectWithError("Missing state parameter");
  }

  if (!client) {
    return redirectWithError("Convex not configured");
  }

  // Lookup state from Convex to get organizationId
  const oauthState = await client.query(api.oauthStates.getByState, {
    state: state,
  });

  if (!oauthState) {
    // Fallback to cookie verification
    const storedState = request.cookies.get(`oauth_state_${platform}`)?.value;
    if (!storedState || storedState !== state) {
      return redirectWithError("Invalid or expired state parameter");
    }
    return redirectWithError(
      "OAuth state expired. Please try connecting again."
    );
  }

  const { organizationId, userId } = oauthState;

  // Get credentials
  const { clientId, clientSecret } = getCredentials(platformKey);
  if (!clientId || !clientSecret) {
    return redirectWithError("Missing platform credentials");
  }

  // Build redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/${platform}/callback`;

  try {
    // Exchange code for tokens
    let tokens;
    if (platformKey === "snapchat") {
      // Snapchat requires Basic Auth header for token exchange
      tokens = await exchangeSnapchatTokens(
        clientId,
        clientSecret,
        code,
        redirectUri
      );
    } else {
      tokens = await exchangeCodeForTokens(
        OAUTH_CONFIGS[platformKey].tokenUrl,
        clientId,
        clientSecret,
        code,
        redirectUri
      );
    }

    // Get account info based on platform
    const accountInfo = await getAccountInfo(platformKey, tokens.access_token);

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptAsync(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptAsync(tokens.refresh_token)
      : undefined;

    // Store integration in Convex WITH organizationId
    await client.mutation(api.integrations.upsertIntegration, {
      organizationId: organizationId,
      platform: platformKey,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : undefined,
      accountId: accountInfo.id,
      accountName: accountInfo.name,
      metadata: accountInfo.metadata,
    });

    // Update onboarding status after connecting integration
    await client.mutation(api.onboarding.updateStatus, {
      organizationId: organizationId,
    });

    // Delete used OAuth state
    await client.mutation(api.oauthStates.remove, { state: state });

    // Clear state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL(`/integrations?connected=${platform}`, baseUrl)
    );
    response.cookies.delete(`oauth_state_${platform}`);
    return response;
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err);

    // Clean up state on error
    try {
      await client.mutation(api.oauthStates.remove, { state: state });
    } catch {
      // Ignore cleanup errors
    }

    return redirectWithError(
      err instanceof Error ? err.message : "Failed to complete authentication"
    );
  }
}

function getCredentials(platform: IntegrationPlatform): {
  clientId?: string;
  clientSecret?: string;
} {
  switch (platform) {
    case "salla":
      return {
        clientId: process.env.SALLA_CLIENT_ID,
        clientSecret: process.env.SALLA_CLIENT_SECRET,
      };
    case "meta":
      return {
        clientId: process.env.META_APP_ID,
        clientSecret: process.env.META_APP_SECRET,
      };
    case "google":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
    case "tiktok":
      return {
        clientId: process.env.TIKTOK_APP_ID,
        clientSecret: process.env.TIKTOK_APP_SECRET,
      };
    case "snapchat":
      return {
        clientId: process.env.SNAPCHAT_CLIENT_ID,
        clientSecret: process.env.SNAPCHAT_CLIENT_SECRET,
      };
    default:
      return {};
  }
}

async function getAccountInfo(
  platform: IntegrationPlatform,
  accessToken: string
): Promise<{ id: string; name: string; metadata?: Record<string, unknown> }> {
  switch (platform) {
    case "salla": {
      const response = await fetch(
        "https://api.salla.dev/admin/v2/store/info",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) throw new Error("Failed to get Salla store info");
      const data = await response.json();
      return {
        id: data.data?.id?.toString() || "",
        name: data.data?.name || "Salla Store",
        metadata: {
          domain: data.data?.domain,
          plan: data.data?.plan,
        },
      };
    }

    case "meta": {
      // Get user's ad accounts
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
      );
      if (!response.ok) throw new Error("Failed to get Meta ad accounts");
      const data = await response.json();
      const account = data.data?.[0];
      if (!account) throw new Error("No Meta ad accounts found");
      return {
        id: account.id,
        name: account.name || "Meta Ad Account",
        metadata: { account_status: account.account_status },
      };
    }

    case "google": {
      // Get accessible customers
      const response = await fetch(
        "https://googleads.googleapis.com/v15/customers:listAccessibleCustomers",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN || "",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to get Google Ads accounts");
      const data = await response.json();
      const customerId = data.resourceNames?.[0]?.split("/")?.[1];
      if (!customerId) throw new Error("No Google Ads accounts found");
      return {
        id: customerId,
        name: `Google Ads Account ${customerId}`,
      };
    }

    case "tiktok": {
      // Get advertiser info
      const response = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/user/info/",
        {
          headers: { "Access-Token": accessToken },
        }
      );
      if (!response.ok) throw new Error("Failed to get TikTok user info");
      const data = await response.json();
      if (data.code !== 0) throw new Error(data.message || "TikTok API error");
      // Get first advertiser
      const advertiser = data.data?.list?.[0];
      if (!advertiser) throw new Error("No TikTok advertiser accounts found");
      return {
        id: advertiser.advertiser_id,
        name: advertiser.advertiser_name || "TikTok Ads Account",
      };
    }

    case "snapchat": {
      // Get ad accounts
      const response = await fetch(
        "https://adsapi.snapchat.com/v1/me/organizations",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok)
        throw new Error("Failed to get Snapchat organizations");
      const data = await response.json();
      const org = data.organizations?.[0]?.organization;
      if (!org) throw new Error("No Snapchat organizations found");

      // Get ad accounts for the organization
      const accountsResponse = await fetch(
        `https://adsapi.snapchat.com/v1/organizations/${org.id}/adaccounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!accountsResponse.ok)
        throw new Error("Failed to get Snapchat ad accounts");
      const accountsData = await accountsResponse.json();
      const adAccount = accountsData.adaccounts?.[0]?.adaccount;
      if (!adAccount) throw new Error("No Snapchat ad accounts found");

      return {
        id: adAccount.id,
        name: adAccount.name || "Snapchat Ad Account",
        metadata: { organization_id: org.id },
      };
    }

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

function redirectWithError(error: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(
    new URL(`/integrations?error=${encodeURIComponent(error)}`, baseUrl)
  );
}

async function exchangeSnapchatTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
) {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(
    "https://accounts.snapchat.com/login/oauth2/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Snapchat token exchange error:", error);
    throw new Error(`Snapchat token exchange failed: ${error}`);
  }

  return response.json();
}
