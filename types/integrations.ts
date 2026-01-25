// Platform types for integrations
export type IntegrationPlatform = "salla" | "shopify" | "meta" | "google" | "tiktok" | "snapchat";

export type SyncType = "campaigns" | "events" | "orders" | "metrics" | "full";

export type SyncStatus = "pending" | "in_progress" | "success" | "failed";

// OAuth configuration for each platform
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

// Platform-specific OAuth configurations
export const OAUTH_CONFIGS: Record<IntegrationPlatform, Omit<OAuthConfig, "clientId" | "clientSecret" | "redirectUri">> = {
  salla: {
    authUrl: "https://accounts.salla.sa/oauth2/auth",
    tokenUrl: "https://accounts.salla.sa/oauth2/token",
    scopes: ["offline_access", "orders.read_write", "products.read_write", "customers.read_write", "branches.read_write"],
  },
  shopify: {
    // Note: authUrl and tokenUrl are per-store: https://{shop}.myshopify.com/admin/oauth/...
    // These are placeholders - actual URLs are built dynamically with shop domain
    authUrl: "https://{shop}.myshopify.com/admin/oauth/authorize",
    tokenUrl: "https://{shop}.myshopify.com/admin/oauth/access_token",
    scopes: ["read_orders", "read_customers", "read_products", "read_analytics"],
  },
  meta: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["ads_read", "ads_management", "business_management"],
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
  },
  tiktok: {
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    scopes: [],
  },
  snapchat: {
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scopes: ["snapchat-marketing-api"],
  },
};

// Integration data structure (matches Convex schema)
export interface Integration {
  _id: string;
  platform: IntegrationPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId: string;
  accountName: string;
  isConnected: boolean;
  lastSyncAt?: number;
  metadata?: Record<string, unknown>;
}

// Sync log structure
export interface SyncLog {
  _id: string;
  integrationId: string;
  syncType: SyncType;
  status: SyncStatus;
  recordsProcessed: number;
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

// OAuth token response
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

// Campaign data from ad platforms (normalized)
export interface CampaignData {
  externalId: string;
  name: string;
  status: "Active" | "Paused" | "Learning" | "Inactive";
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpa: number;
}

// Order data from e-commerce (Salla)
export interface OrderData {
  orderId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "cancelled";
  customerId?: string;
  customerEmail?: string;
  createdAt: number;
  items: OrderItem[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// Salla webhook event types
export type SallaWebhookEvent =
  | "order.created"
  | "order.updated"
  | "order.refunded"
  | "order.deleted"
  | "order.cancelled"
  | "order.payment.updated"
  | "customer.created"
  | "customer.updated"
  | "product.created"
  | "product.updated";

// Salla webhook payload
export interface SallaWebhookPayload {
  event: SallaWebhookEvent;
  merchant: number;
  created_at: string;
  data: Record<string, unknown>;
}

// Shopify webhook event types
export type ShopifyWebhookEvent =
  | "orders/create"
  | "orders/updated"
  | "orders/paid"
  | "orders/cancelled"
  | "refunds/create";

// Shopify webhook payload
export interface ShopifyWebhookPayload {
  id: number;
  admin_graphql_api_id: string;
  [key: string]: unknown;
}

// Platform display info for UI
export interface PlatformDisplayInfo {
  id: IntegrationPlatform;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "ecommerce" | "advertising";
}

export const PLATFORM_INFO: Record<IntegrationPlatform, Omit<PlatformDisplayInfo, "id">> = {
  salla: {
    name: "Salla",
    description: "Saudi Arabia's leading e-commerce platform",
    icon: "storefront",
    color: "#6366f1",
    category: "ecommerce",
  },
  shopify: {
    name: "Shopify",
    description: "Global e-commerce platform",
    icon: "shopping_cart",
    color: "#96bf48",
    category: "ecommerce",
  },
  meta: {
    name: "Meta Ads",
    description: "Facebook & Instagram advertising",
    icon: "public",
    color: "#1877f2",
    category: "advertising",
  },
  google: {
    name: "Google Ads",
    description: "Search, Display & YouTube ads",
    icon: "search",
    color: "#4285f4",
    category: "advertising",
  },
  tiktok: {
    name: "TikTok Ads",
    description: "TikTok for Business advertising",
    icon: "music_note",
    color: "#000000",
    category: "advertising",
  },
  snapchat: {
    name: "Snapchat Ads",
    description: "Snapchat marketing platform",
    icon: "chat_bubble",
    color: "#fffc00",
    category: "advertising",
  },
};

// Re-export token exchange helpers
export { exchangeCodeForTokens, refreshTokens } from "@/lib/integrations/base";
import { buildOAuthUrl as baseBuildOAuthUrl } from "@/lib/integrations/base";

/**
 * Build OAuth URL for a specific platform (wrapper around base function)
 */
export function buildOAuthUrl(
  platform: IntegrationPlatform,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const config = OAUTH_CONFIGS[platform];
  return baseBuildOAuthUrl(
    config.authUrl,
    clientId,
    redirectUri,
    config.scopes,
    state
  );
}
