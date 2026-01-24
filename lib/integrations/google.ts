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

const GOOGLE_ADS_API_VERSION = "v15";
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/**
 * Google Ads API Client
 * Documentation: https://developers.google.com/google-ads/api/docs/start
 */
export class GoogleAdsClient extends BaseAdPlatformClient {
  private customerId: string;
  private developerToken: string;

  constructor(
    accessToken: string,
    customerId: string,
    developerToken: string,
    refreshToken?: string
  ) {
    super("google", accessToken, refreshToken);
    // Remove dashes from customer ID if present
    this.customerId = customerId.replace(/-/g, "");
    this.developerToken = developerToken;
  }

  protected getBaseUrl(): string {
    return GOOGLE_ADS_API_BASE;
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "developer-token": this.developerToken,
      "login-customer-id": this.customerId,
    };
  }

  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    if (!this.refreshToken) {
      throw new IntegrationError("No refresh token available", "google");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new IntegrationError("Google credentials not configured", "google");
    }

    const tokens = await refreshTokens(
      OAUTH_CONFIGS.google.tokenUrl,
      clientId,
      clientSecret,
      this.refreshToken
    );

    this.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }

    return tokens;
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
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `;

    const response = await this.executeQuery(query);
    const customer = response[0]?.customer;

    if (!customer) {
      throw new IntegrationError("Failed to get account info", "google");
    }

    return {
      id: customer.id,
      name: customer.descriptive_name || "",
      currency: customer.currency_code || "USD",
      timezone: customer.time_zone || "UTC",
    };
  }

  public async fetchCampaigns(): Promise<CampaignData[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.conversions_value,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status != 'REMOVED'
    `;

    const response = await this.executeQuery(query);

    return response.map((row: GoogleAdsRow) => {
      const spend = (row.metrics?.cost_micros || 0) / 1_000_000;
      const revenue = row.metrics?.conversions_value || 0;
      const conversions = row.metrics?.conversions || 0;

      return {
        externalId: row.campaign?.id || "",
        name: row.campaign?.name || "",
        status: this.mapCampaignStatus(row.campaign?.status || ""),
        spend,
        revenue,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        conversions,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    });
  }

  public async fetchCampaignMetrics(
    campaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CampaignData[]> {
    if (campaignIds.length === 0) return [];

    const startStr = startDate.toISOString().split("T")[0].replace(/-/g, "");
    const endStr = endDate.toISOString().split("T")[0].replace(/-/g, "");

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.conversions_value,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startStr}' AND '${endStr}'
        AND campaign.id IN (${campaignIds.join(",")})
    `;

    const response = await this.executeQuery(query);

    return response.map((row: GoogleAdsRow) => {
      const spend = (row.metrics?.cost_micros || 0) / 1_000_000;
      const revenue = row.metrics?.conversions_value || 0;
      const conversions = row.metrics?.conversions || 0;

      return {
        externalId: row.campaign?.id || "",
        name: row.campaign?.name || "",
        status: this.mapCampaignStatus(row.campaign?.status || ""),
        spend,
        revenue,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
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
    const startStr = startDate.toISOString().split("T")[0].replace(/-/g, "");
    const endStr = endDate.toISOString().split("T")[0].replace(/-/g, "");

    const query = `
      SELECT
        segments.date,
        metrics.cost_micros,
        metrics.conversions_value,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM customer
      WHERE segments.date BETWEEN '${startStr}' AND '${endStr}'
      ORDER BY segments.date
    `;

    const response = await this.executeQuery(query);

    return response.map((row: GoogleAdsRow) => ({
      date: row.segments?.date || "",
      spend: (row.metrics?.cost_micros || 0) / 1_000_000,
      revenue: row.metrics?.conversions_value || 0,
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      conversions: row.metrics?.conversions || 0,
    }));
  }

  private async executeQuery(query: string): Promise<GoogleAdsRow[]> {
    const response = await this.request<{ results: GoogleAdsRow[] }>(
      `/customers/${this.customerId}/googleAds:searchStream`,
      {
        method: "POST",
        body: JSON.stringify({ query }),
      }
    );

    return response.results || [];
  }

  private mapCampaignStatus(
    status: string
  ): "Active" | "Paused" | "Learning" | "Inactive" {
    switch (status.toUpperCase()) {
      case "ENABLED":
        return "Active";
      case "PAUSED":
        return "Paused";
      default:
        return "Inactive";
    }
  }
}

// Google Ads API Response Types
interface GoogleAdsRow {
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
  metrics?: {
    cost_micros: number;
    conversions_value: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
  segments?: {
    date: string;
  };
  customer?: {
    id: string;
    descriptive_name: string;
    currency_code: string;
    time_zone: string;
  };
}
