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

const META_GRAPH_API_VERSION = "v18.0";
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/**
 * Meta (Facebook) Marketing API Client
 * Documentation: https://developers.facebook.com/docs/marketing-apis/
 */
export class MetaAdsClient extends BaseAdPlatformClient {
  private adAccountId: string;

  constructor(accessToken: string, adAccountId: string, refreshToken?: string) {
    super("meta", accessToken, refreshToken);
    // Meta ad account IDs should be prefixed with "act_"
    this.adAccountId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
  }

  protected getBaseUrl(): string {
    return META_GRAPH_API_BASE;
  }

  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    // Meta uses long-lived tokens that need to be exchanged
    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;

    if (!clientId || !clientSecret) {
      throw new IntegrationError("Meta credentials not configured", "meta");
    }

    // Exchange for a new long-lived token
    const response = await fetch(
      `${META_GRAPH_API_BASE}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: this.accessToken,
        })
    );

    if (!response.ok) {
      throw new IntegrationError(
        "Failed to refresh Meta access token",
        "meta",
        response.status
      );
    }

    const data = await response.json();
    this.accessToken = data.access_token;

    return {
      access_token: data.access_token,
      token_type: "bearer",
      expires_in: data.expires_in,
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
    const response = await this.request<{
      id: string;
      name: string;
      currency: string;
      timezone_name: string;
    }>(`/${this.adAccountId}?fields=id,name,currency,timezone_name`);

    return {
      id: response.id,
      name: response.name,
      currency: response.currency,
      timezone: response.timezone_name,
    };
  }

  public async fetchCampaigns(): Promise<CampaignData[]> {
    const response = await this.request<{
      data: MetaCampaignResponse[];
    }>(
      `/${this.adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=100`
    );

    // Fetch insights for all campaigns
    const campaignIds = response.data.map((c) => c.id);
    const insights = await this.fetchCampaignInsights(campaignIds);

    return response.data.map((campaign) => {
      const campaignInsights = insights.find((i) => i.campaign_id === campaign.id);
      const spend = campaignInsights?.spend || 0;
      const revenue = campaignInsights?.purchase_value || 0;

      return {
        externalId: campaign.id,
        name: campaign.name,
        status: this.mapCampaignStatus(campaign.status),
        spend,
        revenue,
        impressions: campaignInsights?.impressions || 0,
        clicks: campaignInsights?.clicks || 0,
        conversions: campaignInsights?.conversions || 0,
        roas: spend > 0 ? revenue / spend : 0,
        cpa:
          campaignInsights?.conversions && campaignInsights.conversions > 0
            ? spend / campaignInsights.conversions
            : 0,
      };
    });
  }

  public async fetchCampaignMetrics(
    campaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CampaignData[]> {
    const insights = await this.fetchCampaignInsights(
      campaignIds,
      startDate,
      endDate
    );

    return insights.map((insight) => {
      const spend = insight.spend || 0;
      const revenue = insight.purchase_value || 0;

      return {
        externalId: insight.campaign_id,
        name: insight.campaign_name || "",
        status: "Active" as const,
        spend,
        revenue,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        conversions: insight.conversions || 0,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: insight.conversions > 0 ? spend / insight.conversions : 0,
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
    const timeRange = JSON.stringify({
      since: startDate.toISOString().split("T")[0],
      until: endDate.toISOString().split("T")[0],
    });

    const response = await this.request<{
      data: MetaInsightsResponse[];
    }>(
      `/${this.adAccountId}/insights?` +
        `fields=date_start,spend,impressions,clicks,actions,action_values&` +
        `time_range=${encodeURIComponent(timeRange)}&` +
        `time_increment=1&level=account`
    );

    return response.data.map((day) => ({
      date: day.date_start,
      spend: parseFloat(day.spend || "0"),
      revenue: this.extractPurchaseValue(day.action_values),
      impressions: parseInt(day.impressions || "0", 10),
      clicks: parseInt(day.clicks || "0", 10),
      conversions: this.extractConversions(day.actions),
    }));
  }

  private async fetchCampaignInsights(
    campaignIds: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<MetaCampaignInsight[]> {
    if (campaignIds.length === 0) return [];

    const timeRange = startDate && endDate
      ? JSON.stringify({
          since: startDate.toISOString().split("T")[0],
          until: endDate.toISOString().split("T")[0],
        })
      : JSON.stringify({
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          until: new Date().toISOString().split("T")[0],
        });

    const response = await this.request<{
      data: MetaInsightsResponse[];
    }>(
      `/${this.adAccountId}/insights?` +
        `fields=campaign_id,campaign_name,spend,impressions,clicks,actions,action_values&` +
        `time_range=${encodeURIComponent(timeRange)}&` +
        `level=campaign&` +
        `filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`
    );

    return response.data.map((insight) => ({
      campaign_id: insight.campaign_id || "",
      campaign_name: insight.campaign_name,
      spend: parseFloat(insight.spend || "0"),
      impressions: parseInt(insight.impressions || "0", 10),
      clicks: parseInt(insight.clicks || "0", 10),
      conversions: this.extractConversions(insight.actions),
      purchase_value: this.extractPurchaseValue(insight.action_values),
    }));
  }

  private extractConversions(actions?: MetaAction[]): number {
    if (!actions) return 0;
    const purchaseAction = actions.find(
      (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
    );
    return purchaseAction ? parseInt(purchaseAction.value, 10) : 0;
  }

  private extractPurchaseValue(actionValues?: MetaActionValue[]): number {
    if (!actionValues) return 0;
    const purchaseValue = actionValues.find(
      (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
    );
    return purchaseValue ? parseFloat(purchaseValue.value) : 0;
  }

  private mapCampaignStatus(
    status: string
  ): "Active" | "Paused" | "Learning" | "Inactive" {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "Active";
      case "PAUSED":
        return "Paused";
      case "IN_PROCESS":
        return "Learning";
      default:
        return "Inactive";
    }
  }
}

// Meta API Response Types
interface MetaCampaignResponse {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaInsightsResponse {
  campaign_id?: string;
  campaign_name?: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: MetaAction[];
  action_values?: MetaActionValue[];
}

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaActionValue {
  action_type: string;
  value: string;
}

interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  purchase_value: number;
}
