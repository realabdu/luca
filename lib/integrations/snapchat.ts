import {
  BaseAdPlatformClient,
  IntegrationError,
  refreshTokens,
} from "./base";
import {
  OAuthTokenResponse,
  CampaignData,
  OAUTH_CONFIGS,
} from "@/types/integrations";

const SNAPCHAT_API_BASE = "https://adsapi.snapchat.com/v1";

// Currency conversion rate (USD to SAR)
const USD_TO_SAR = 3.75;

/**
 * Snapchat Marketing API Client
 * Documentation: https://developers.snap.com/api/marketing-api/Ads-API/introduction
 */
export class SnapchatAdsClient extends BaseAdPlatformClient {
  private adAccountId: string;
  private allAdAccountIds: string[] = [];

  constructor(accessToken: string, adAccountId: string, refreshToken?: string) {
    super("snapchat", accessToken, refreshToken);
    this.adAccountId = adAccountId;
  }

  /**
   * Fetch all ad accounts the user has access to
   */
  public async getAllAdAccounts(): Promise<Array<{ id: string; name: string; currency: string }>> {
    // First get organizations
    const orgResponse = await this.request<{ organizations: Array<{ organization: { id: string; name: string } }> }>(
      "/me/organizations"
    );

    const organizations = orgResponse.organizations || [];
    const allAccounts: Array<{ id: string; name: string; currency: string }> = [];

    // For each organization, get all ad accounts
    for (const org of organizations) {
      const accountsResponse = await this.request<SnapchatApiResponse<SnapchatAdAccount>>(
        `/organizations/${org.organization.id}/adaccounts`
      );

      const accounts = accountsResponse.adaccounts || [];
      for (const acc of accounts) {
        allAccounts.push({
          id: acc.adaccount.id,
          name: acc.adaccount.name,
          currency: acc.adaccount.currency || "SAR",
        });
      }
    }

    // Store for later use
    this.allAdAccountIds = allAccounts.map(a => a.id);
    console.log(`[Snapchat] Found ${allAccounts.length} ad accounts:`, allAccounts.map(a => a.name));

    return allAccounts;
  }

  /**
   * Get total spend across ALL ad accounts for a date range
   */
  public async getTotalSpendAllAccounts(startDate: Date, endDate: Date): Promise<{
    totalSpend: number;
    byAccount: Array<{ id: string; name: string; spend: number }>;
  }> {
    const accounts = await this.getAllAdAccounts();
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    console.log(`[Snapchat] Fetching spend for ${accounts.length} ad accounts from ${startStr} to ${endStr}`);

    const byAccount: Array<{ id: string; name: string; spend: number }> = [];
    let totalSpend = 0;

    for (const account of accounts) {
      try {
        const response = await this.request<SnapchatStatsResponse>(
          `/adaccounts/${account.id}/stats?` +
            new URLSearchParams({
              granularity: "TOTAL",
              start_time: startStr,
              end_time: endStr,
              fields: "spend",
            })
        );

        const spendUSD = (response.total_stats?.[0]?.total_stat?.stats?.spend || 0) / 1_000_000;
        const spendSAR = spendUSD * USD_TO_SAR;
        byAccount.push({ id: account.id, name: account.name, spend: spendSAR });
        totalSpend += spendSAR;

        console.log(`[Snapchat] Account "${account.name}" (${account.id}): ${spendUSD.toFixed(2)} USD = ${spendSAR.toFixed(2)} SAR`);
      } catch (error) {
        console.error(`[Snapchat] Failed to fetch spend for account ${account.name}:`, error);
        byAccount.push({ id: account.id, name: account.name, spend: 0 });
      }
    }

    console.log(`[Snapchat] Total spend across all accounts: ${totalSpend.toFixed(2)} SAR`);
    return { totalSpend, byAccount };
  }

  protected getBaseUrl(): string {
    return SNAPCHAT_API_BASE;
  }

  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    if (!this.refreshToken) {
      throw new IntegrationError("No refresh token available", "snapchat");
    }

    const clientId = process.env.SNAPCHAT_CLIENT_ID;
    const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new IntegrationError(
        "Snapchat credentials not configured",
        "snapchat"
      );
    }

    // Snapchat requires Basic Auth for token refresh (same as token exchange)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(OAUTH_CONFIGS.snapchat.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new IntegrationError(
        `Snapchat token refresh failed: ${error}`,
        "snapchat",
        response.status
      );
    }

    const tokens: OAuthTokenResponse = await response.json();

    this.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }

    return tokens;
  }

  /**
   * Get the current tokens (for saving after refresh)
   */
  public getTokens(): { accessToken: string; refreshToken?: string } {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    };
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.getAdAccountInfo();
      return true;
    } catch {
      return false;
    }
  }

  public async getAdAccountInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
    timezone: string;
  }> {
    const response = await this.request<SnapchatApiResponse<SnapchatAdAccount>>(
      `/adaccounts/${this.adAccountId}`
    );

    const adAccount = response.adaccounts?.[0]?.adaccount;

    if (!adAccount) {
      throw new IntegrationError("Failed to get ad account info", "snapchat");
    }

    return {
      id: adAccount.id,
      name: adAccount.name,
      currency: adAccount.currency || "USD",
      timezone: adAccount.timezone || "UTC",
    };
  }

  public async fetchCampaigns(): Promise<CampaignData[]> {
    // Fetch campaigns
    const campaignsResponse = await this.request<SnapchatApiResponse<SnapchatCampaign>>(
      `/adaccounts/${this.adAccountId}/campaigns`
    );

    const campaigns = campaignsResponse.campaigns || [];

    // Fetch stats for the last 30 days
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const campaignIds = campaigns.map((c) => c.campaign.id);
    const stats = await this.fetchCampaignStats(campaignIds, startDate, endDate);

    return campaigns.map((c) => {
      const campaign = c.campaign;
      const campaignStats = stats.find(
        (s) => s.id === campaign.id
      );
      const spend = ((campaignStats?.stats?.spend ?? 0) / 1_000_000) * USD_TO_SAR; // Convert USD to SAR
      const revenue = ((campaignStats?.stats?.conversion_purchases_value ?? 0) / 1_000_000) * USD_TO_SAR;
      const conversions = campaignStats?.stats?.conversion_purchases ?? 0;

      return {
        externalId: campaign.id,
        name: campaign.name,
        status: this.mapCampaignStatus(campaign.status),
        spend,
        revenue,
        impressions: campaignStats?.stats?.impressions ?? 0,
        clicks: campaignStats?.stats?.swipes ?? 0, // Snapchat uses "swipes"
        conversions,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    });
  }

  /**
   * Fetch campaigns from ALL ad accounts
   */
  public async fetchCampaignsAllAccounts(): Promise<CampaignData[]> {
    const accounts = await this.getAllAdAccounts();
    console.log(`[Snapchat] Fetching campaigns from ${accounts.length} ad accounts`);

    const allCampaigns: CampaignData[] = [];
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const account of accounts) {
      try {
        const campaignsResponse = await this.request<SnapchatApiResponse<SnapchatCampaign>>(
          `/adaccounts/${account.id}/campaigns`
        );

        const campaigns = campaignsResponse.campaigns || [];
        console.log(`[Snapchat] Account "${account.name}": ${campaigns.length} campaigns`);

        // Fetch stats for this account's campaigns
        const campaignIds = campaigns.map((c) => c.campaign.id);
        const stats = await this.fetchCampaignStats(campaignIds, startDate, endDate);

        for (const c of campaigns) {
          const campaign = c.campaign;
          const campaignStats = stats.find((s) => s.id === campaign.id);
          const spend = ((campaignStats?.stats?.spend ?? 0) / 1_000_000) * USD_TO_SAR;
          const revenue = ((campaignStats?.stats?.conversion_purchases_value ?? 0) / 1_000_000) * USD_TO_SAR;
          const conversions = campaignStats?.stats?.conversion_purchases ?? 0;

          allCampaigns.push({
            externalId: campaign.id,
            name: `[${account.name}] ${campaign.name}`,
            status: this.mapCampaignStatus(campaign.status),
            spend,
            revenue,
            impressions: campaignStats?.stats?.impressions ?? 0,
            clicks: campaignStats?.stats?.swipes ?? 0,
            conversions,
            roas: spend > 0 ? revenue / spend : 0,
            cpa: conversions > 0 ? spend / conversions : 0,
          });
        }
      } catch (error) {
        console.error(`[Snapchat] Failed to fetch campaigns for account ${account.name}:`, error);
      }
    }

    console.log(`[Snapchat] Total campaigns across all accounts: ${allCampaigns.length}`);
    return allCampaigns;
  }

  public async fetchCampaignMetrics(
    campaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CampaignData[]> {
    const stats = await this.fetchCampaignStats(campaignIds, startDate, endDate);

    return stats.map((s) => {
      const spend = (s.stats.spend / 1_000_000) * USD_TO_SAR || 0;
      const revenue = (s.stats.conversion_purchases_value / 1_000_000) * USD_TO_SAR || 0;
      const conversions = s.stats.conversion_purchases || 0;

      return {
        externalId: s.id,
        name: "",
        status: "Active" as const,
        spend,
        revenue,
        impressions: s.stats.impressions || 0,
        clicks: s.stats.swipes || 0,
        conversions,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    });
  }

  public async fetchDailyPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: string;
      spend: number;
      revenue: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>
  > {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    console.log(`[Snapchat] Fetching daily stats for ad account ${this.adAccountId}`);
    console.log(`[Snapchat] Date range: ${startStr} to ${endStr}`);

    // Ad account level stats only support 'spend' field
    const response = await this.request<SnapchatStatsResponse>(
      `/adaccounts/${this.adAccountId}/stats?` +
        new URLSearchParams({
          granularity: "DAY",
          start_time: startStr,
          end_time: endStr,
          fields: "spend",
        })
    );

    const timeseries = response.timeseries_stats?.[0]?.timeseries_stat?.timeseries || [];

    // Debug: log raw response with currency conversion
    const rawTotal = timeseries.reduce((sum, ts) => sum + (ts.stats?.spend || 0), 0);
    const totalUSD = rawTotal / 1_000_000;
    const totalSAR = totalUSD * USD_TO_SAR;
    console.log(`[Snapchat] Raw spend total (microcurrency): ${rawTotal}`);
    console.log(`[Snapchat] Converted spend: ${totalUSD.toFixed(2)} USD = ${totalSAR.toFixed(2)} SAR`);
    console.log(`[Snapchat] Days returned: ${timeseries.length}`);

    return timeseries.map((ts) => ({
      date: ts.start_time.split("T")[0],
      spend: ((ts.stats?.spend || 0) / 1_000_000) * USD_TO_SAR,
      revenue: 0, // Not available at ad account level
      impressions: 0,
      clicks: 0,
      conversions: 0,
    }));
  }

  /**
   * Fast method to get total spend for a date range (single API call)
   * Use this for dashboard instead of fetchCampaigns which is slow
   */
  public async getTotalSpend(startDate: Date, endDate: Date): Promise<number> {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const response = await this.request<SnapchatStatsResponse>(
      `/adaccounts/${this.adAccountId}/stats?` +
        new URLSearchParams({
          granularity: "TOTAL",
          start_time: startStr,
          end_time: endStr,
          fields: "spend",
        })
    );

    const totalSpendMicro = response.total_stats?.[0]?.total_stat?.stats?.spend || 0;
    const totalSpendUSD = totalSpendMicro / 1_000_000;
    return totalSpendUSD * USD_TO_SAR; // Convert from microcurrency USD to SAR
  }

  private async fetchCampaignStats(
    campaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ id: string; stats: SnapchatStats }>> {
    if (campaignIds.length === 0) return [];

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const results: Array<{ id: string; stats: SnapchatStats }> = [];

    // Snapchat requires fetching stats per campaign
    for (const campaignId of campaignIds) {
      try {
        const response = await this.request<SnapchatStatsResponse>(
          `/campaigns/${campaignId}/stats?` +
            new URLSearchParams({
              granularity: "TOTAL",
              start_time: startStr,
              end_time: endStr,
              fields: "impressions,swipes,spend,conversion_purchases,conversion_purchases_value",
            })
        );

        const stats = response.total_stats?.[0]?.total_stat?.stats;
        if (stats) {
          results.push({ id: campaignId, stats });
        }
      } catch (error) {
        // Skip campaigns with errors
        console.error(`Failed to fetch stats for campaign ${campaignId}:`, error);
      }
    }

    return results;
  }

  private mapCampaignStatus(
    status: string
  ): "Active" | "Paused" | "Learning" | "Inactive" {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "Active";
      case "PAUSED":
        return "Paused";
      default:
        return "Inactive";
    }
  }
}

// Snapchat API Response Types
interface SnapchatApiResponse<T> {
  request_status: string;
  request_id: string;
  adaccounts?: Array<{ adaccount: T }>;
  campaigns?: Array<{ campaign: T }>;
}

interface SnapchatAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
}

interface SnapchatCampaign {
  id: string;
  name: string;
  status: string;
  ad_account_id: string;
  daily_budget_micro?: number;
  lifetime_spend_cap_micro?: number;
}

interface SnapchatStats {
  impressions: number;
  swipes: number;
  spend: number;
  conversion_purchases: number;
  conversion_purchases_value: number;
}

interface SnapchatStatsResponse {
  request_status: string;
  total_stats?: Array<{
    total_stat: {
      id: string;
      type: string;
      stats: SnapchatStats;
    };
  }>;
  timeseries_stats?: Array<{
    timeseries_stat: {
      id: string;
      type: string;
      timeseries: Array<{
        start_time: string;
        end_time: string;
        stats: SnapchatStats;
      }>;
    };
  }>;
}
