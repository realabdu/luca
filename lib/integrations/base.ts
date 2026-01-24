import {
  IntegrationPlatform,
  OAuthTokenResponse,
  CampaignData,
  OrderData,
} from "@/types/integrations";

/**
 * Base class for all integration clients
 * Provides common functionality for OAuth, API calls, and error handling
 */
export abstract class BaseIntegrationClient {
  protected platform: IntegrationPlatform;
  protected accessToken: string;
  protected refreshToken?: string;
  protected baseUrl: string;

  constructor(
    platform: IntegrationPlatform,
    accessToken: string,
    refreshToken?: string
  ) {
    this.platform = platform;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.baseUrl = this.getBaseUrl();
  }

  /**
   * Get the base API URL for this platform
   */
  protected abstract getBaseUrl(): string;

  /**
   * Refresh the access token using the refresh token
   */
  public abstract refreshAccessToken(): Promise<OAuthTokenResponse>;

  /**
   * Test the connection to verify credentials are valid
   */
  public abstract testConnection(): Promise<boolean>;

  /**
   * Fetch campaigns from the ad platform
   */
  public abstract fetchCampaigns(): Promise<CampaignData[]>;

  /**
   * Make an authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.getAuthHeaders(),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new IntegrationError(
        `${this.platform} API error: ${response.status} - ${error}`,
        this.platform,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Get authorization headers for API requests
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Update access token (after refresh)
   */
  public setAccessToken(token: string): void {
    this.accessToken = token;
  }
}

/**
 * Custom error class for integration errors
 */
export class IntegrationError extends Error {
  public platform: IntegrationPlatform;
  public statusCode?: number;
  public retryable: boolean;

  constructor(
    message: string,
    platform: IntegrationPlatform,
    statusCode?: number
  ) {
    super(message);
    this.name = "IntegrationError";
    this.platform = platform;
    this.statusCode = statusCode;
    // Rate limit (429) and server errors (5xx) are retryable
    this.retryable =
      statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
  }
}

/**
 * E-commerce integration base class (for Salla, Zid, etc.)
 */
export abstract class BaseEcommerceClient extends BaseIntegrationClient {
  /**
   * Fetch orders from the e-commerce platform
   */
  public abstract fetchOrders(
    since?: Date,
    limit?: number
  ): Promise<OrderData[]>;

  /**
   * Fetch a single order by ID
   */
  public abstract fetchOrder(orderId: string): Promise<OrderData>;

  /**
   * Get store/merchant information
   */
  public abstract getStoreInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
  }>;
}

/**
 * Ad platform integration base class
 */
export abstract class BaseAdPlatformClient extends BaseIntegrationClient {
  /**
   * Get ad account information
   */
  public abstract getAdAccountInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
    timezone: string;
  }>;

  /**
   * Fetch campaign metrics for a date range
   */
  public abstract fetchCampaignMetrics(
    campaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CampaignData[]>;

  /**
   * Fetch daily performance data
   */
  public abstract fetchDailyPerformance(
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
  >;
}

/**
 * OAuth helper functions
 */
export function buildOAuthUrl(
  authUrl: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
    ...extraParams,
  });

  return `${authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export async function refreshTokens(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}
