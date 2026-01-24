import {
  BaseAdPlatformClient,
  IntegrationError,
} from "./base";
import {
  OAuthTokenResponse,
  CampaignData,
} from "@/types/integrations";

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

/**
 * TikTok Marketing API Client
 * Documentation: https://business-api.tiktok.com/portal/docs
 */
export class TikTokAdsClient extends BaseAdPlatformClient {
  private advertiserId: string;

  constructor(accessToken: string, advertiserId: string) {
    super("tiktok", accessToken);
    this.advertiserId = advertiserId;
  }

  protected getBaseUrl(): string {
    return TIKTOK_API_BASE;
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "Access-Token": this.accessToken,
    };
  }

  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    // TikTok uses long-lived tokens - implement refresh if needed
    const appId = process.env.TIKTOK_APP_ID;
    const appSecret = process.env.TIKTOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new IntegrationError("TikTok credentials not configured", "tiktok");
    }

    // TikTok token refresh endpoint
    const response = await fetch(
      `${TIKTOK_API_BASE}/oauth2/refresh_token/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          secret: appSecret,
          refresh_token: this.refreshToken,
        }),
      }
    );

    if (!response.ok) {
      throw new IntegrationError(
        "Failed to refresh TikTok access token",
        "tiktok",
        response.status
      );
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new IntegrationError(
        data.message || "TikTok token refresh failed",
        "tiktok"
      );
    }

    this.accessToken = data.data.access_token;

    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      token_type: "bearer",
      expires_in: data.data.expires_in,
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
    const response = await this.request<TikTokApiResponse<{ list: TikTokAdvertiserInfo[] }>>(
      `/advertiser/info/?advertiser_ids=["${this.advertiserId}"]`
    );

    if (response.code !== 0 || !response.data?.list?.[0]) {
      throw new IntegrationError(
        response.message || "Failed to get advertiser info",
        "tiktok"
      );
    }

    const advertiser = response.data.list[0];

    return {
      id: advertiser.advertiser_id,
      name: advertiser.advertiser_name,
      currency: advertiser.currency || "USD",
      timezone: advertiser.timezone || "UTC",
    };
  }

  public async fetchCampaigns(): Promise<CampaignData[]> {
    // First, get all campaigns
    const campaignsResponse = await this.request<TikTokApiResponse<{ list: TikTokCampaign[] }>>(
      `/campaign/get/?advertiser_id=${this.advertiserId}&page_size=100`
    );

    if (campaignsResponse.code !== 0) {
      throw new IntegrationError(
        campaignsResponse.message || "Failed to fetch campaigns",
        "tiktok"
      );
    }

    const campaigns = campaignsResponse.data?.list || [];

    // Get metrics for all campaigns
    const campaignIds = campaigns.map((c) => c.campaign_id);
    const metrics = await this.fetchCampaignReports(campaignIds);

    return campaigns.map((campaign) => {
      const campaignMetrics = metrics.find(
        (m) => m.dimensions.campaign_id === campaign.campaign_id
      );
      const spend = campaignMetrics?.metrics.spend || 0;
      const revenue = campaignMetrics?.metrics.total_complete_payment_value || 0;
      const conversions = campaignMetrics?.metrics.complete_payment || 0;

      return {
        externalId: campaign.campaign_id,
        name: campaign.campaign_name,
        status: this.mapCampaignStatus(campaign.status),
        spend,
        revenue,
        impressions: campaignMetrics?.metrics.impressions || 0,
        clicks: campaignMetrics?.metrics.clicks || 0,
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
    const metrics = await this.fetchCampaignReports(campaignIds, startDate, endDate);

    return metrics.map((m) => {
      const spend = m.metrics.spend || 0;
      const revenue = m.metrics.total_complete_payment_value || 0;
      const conversions = m.metrics.complete_payment || 0;

      return {
        externalId: m.dimensions.campaign_id,
        name: "",
        status: "Active" as const,
        spend,
        revenue,
        impressions: m.metrics.impressions || 0,
        clicks: m.metrics.clicks || 0,
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

    const response = await this.request<TikTokApiResponse<{ list: TikTokReportRow[] }>>(
      `/report/integrated/get/`,
      {
        method: "POST",
        body: JSON.stringify({
          advertiser_id: this.advertiserId,
          report_type: "BASIC",
          dimensions: ["stat_time_day"],
          metrics: [
            "spend",
            "impressions",
            "clicks",
            "complete_payment",
            "total_complete_payment_value",
          ],
          data_level: "AUCTION_ADVERTISER",
          start_date: startStr,
          end_date: endStr,
        }),
      }
    );

    if (response.code !== 0) {
      throw new IntegrationError(
        response.message || "Failed to fetch daily performance",
        "tiktok"
      );
    }

    return (response.data?.list || []).map((row) => ({
      date: row.dimensions.stat_time_day || "",
      spend: row.metrics.spend || 0,
      revenue: row.metrics.total_complete_payment_value || 0,
      impressions: row.metrics.impressions || 0,
      clicks: row.metrics.clicks || 0,
      conversions: row.metrics.complete_payment || 0,
    }));
  }

  private async fetchCampaignReports(
    campaignIds: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<TikTokReportRow[]> {
    if (campaignIds.length === 0) return [];

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const response = await this.request<TikTokApiResponse<{ list: TikTokReportRow[] }>>(
      `/report/integrated/get/`,
      {
        method: "POST",
        body: JSON.stringify({
          advertiser_id: this.advertiserId,
          report_type: "BASIC",
          dimensions: ["campaign_id"],
          metrics: [
            "spend",
            "impressions",
            "clicks",
            "complete_payment",
            "total_complete_payment_value",
          ],
          data_level: "AUCTION_CAMPAIGN",
          start_date: start.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          filters: [
            {
              field_name: "campaign_id",
              filter_type: "IN",
              filter_value: JSON.stringify(campaignIds),
            },
          ],
        }),
      }
    );

    if (response.code !== 0) {
      throw new IntegrationError(
        response.message || "Failed to fetch campaign reports",
        "tiktok"
      );
    }

    return response.data?.list || [];
  }

  private mapCampaignStatus(
    status: string
  ): "Active" | "Paused" | "Learning" | "Inactive" {
    switch (status.toUpperCase()) {
      case "CAMPAIGN_STATUS_ENABLE":
      case "ENABLE":
        return "Active";
      case "CAMPAIGN_STATUS_DISABLE":
      case "DISABLE":
        return "Paused";
      default:
        return "Inactive";
    }
  }
}

// TikTok API Response Types
interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

interface TikTokAdvertiserInfo {
  advertiser_id: string;
  advertiser_name: string;
  currency: string;
  timezone: string;
}

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  budget: number;
  budget_mode: string;
}

interface TikTokReportRow {
  dimensions: {
    campaign_id: string;
    stat_time_day?: string;
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    complete_payment: number;
    total_complete_payment_value: number;
  };
}
