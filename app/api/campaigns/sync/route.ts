import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { decryptAsync, encryptAsync } from "@/lib/encryption";
import { SnapchatAdsClient } from "@/lib/integrations/snapchat";
import { IntegrationError } from "@/lib/integrations/base";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

/**
 * Helper to refresh Snapchat tokens and save to database
 */
async function refreshSnapchatTokens(
  client: ConvexHttpClient,
  snapchatClient: SnapchatAdsClient
): Promise<boolean> {
  try {
    console.log("Attempting Snapchat token refresh...");
    const newTokens = await snapchatClient.refreshAccessToken();

    // Save refreshed tokens to database
    const tokens = snapchatClient.getTokens();
    await client.mutation(api.integrations.updateTokens, {
      platform: "snapchat",
      accessToken: await encryptAsync(tokens.accessToken),
      refreshToken: tokens.refreshToken ? await encryptAsync(tokens.refreshToken) : undefined,
      expiresAt: newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : undefined,
    });

    console.log("Snapchat tokens refreshed and saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to refresh Snapchat tokens:", error);
    return false;
  }
}

/**
 * POST /api/campaigns/sync
 * Syncs campaigns from connected ad platforms to Convex
 */
export async function POST(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const results = {
      snapchat: { synced: 0, errors: [] as string[] },
    };

    // Fetch Snapchat credentials
    const snapchatCredentials = await client.query(api.integrations.getCredentials, { platform: "snapchat" });

    if (snapchatCredentials) {
      const accessToken = await decryptAsync(snapchatCredentials.accessToken);
      const snapchatClient = new SnapchatAdsClient(
        accessToken,
        snapchatCredentials.accountId,
        snapchatCredentials.refreshToken ? await decryptAsync(snapchatCredentials.refreshToken) : undefined
      );

      // Helper to fetch campaigns from ALL accounts with retry on 401
      const fetchCampaignsWithRetry = async () => {
        try {
          return await snapchatClient.fetchCampaignsAllAccounts();
        } catch (error) {
          const is401 = error instanceof IntegrationError && error.statusCode === 401;
          if (is401) {
            console.log("Snapchat 401 during campaign sync, attempting token refresh...");
            const refreshed = await refreshSnapchatTokens(client, snapchatClient);
            if (refreshed) {
              return await snapchatClient.fetchCampaignsAllAccounts();
            }
          }
          throw error;
        }
      };

      try {
        // Fetch campaigns from Snapchat
        const campaigns = await fetchCampaignsWithRetry();

        // Get existing campaigns from Convex
        const existingCampaigns = await client.query(api.campaigns.listAll, { platform: "Snapchat" });
        const existingIds = new Set(existingCampaigns.map((c: any) => c.externalId));

        // Sync each campaign
        for (const campaign of campaigns) {
          try {
            // Check if campaign already exists
            const existing = existingCampaigns.find((c: any) => c.externalId === campaign.externalId);

            if (existing) {
              // Update existing campaign
              await client.mutation(api.campaigns.update, {
                id: existing._id,
                name: campaign.name,
                status: campaign.status,
                spend: campaign.spend,
                revenue: campaign.revenue,
                roas: campaign.roas,
                cpa: campaign.cpa,
              });
            } else {
              // Create new campaign
              await client.mutation(api.campaigns.create, {
                name: campaign.name,
                platform: "Snapchat" as const,
                status: campaign.status,
                spend: campaign.spend,
                revenue: campaign.revenue,
                roas: campaign.roas,
                cpa: campaign.cpa,
                externalId: campaign.externalId,
              });
            }
            results.snapchat.synced++;
          } catch (err) {
            results.snapchat.errors.push(
              `Failed to sync campaign ${campaign.name}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        }
      } catch (error) {
        results.snapchat.errors.push(
          `Failed to fetch Snapchat campaigns: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      results.snapchat.errors.push("Snapchat not connected");
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Campaign sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync campaigns" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/sync
 * Returns current sync status
 */
export async function GET(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);

    // Get campaign counts by platform
    const allCampaigns = await client.query(api.campaigns.list, {});

    const byPlatform = allCampaigns.reduce((acc: Record<string, number>, c: any) => {
      acc[c.platform] = (acc[c.platform] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      total: allCampaigns.length,
      byPlatform,
      campaigns: allCampaigns.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error("Campaign status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get campaign status" },
      { status: 500 }
    );
  }
}
