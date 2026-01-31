// Export all integration clients
export { SallaClient, parseSallaWebhook, verifySallaWebhook } from "./salla";
export { ShopifyClient, parseShopifyWebhook, verifyShopifyWebhook, exchangeShopifyTokens } from "./shopify";
export { MetaAdsClient } from "./meta";
export { GoogleAdsClient } from "./google";
export { TikTokAdsClient } from "./tiktok";
export { SnapchatAdsClient } from "./snapchat";

// Export base classes and utilities
export {
  BaseIntegrationClient,
  BaseEcommerceClient,
  BaseAdPlatformClient,
  IntegrationError,
  buildOAuthUrl,
  exchangeCodeForTokens,
  refreshTokens,
} from "./base";

// Import types
import { IntegrationPlatform } from "@/types/integrations";
import { SallaClient } from "./salla";
import { ShopifyClient } from "./shopify";
import { MetaAdsClient } from "./meta";
import { GoogleAdsClient } from "./google";
import { TikTokAdsClient } from "./tiktok";
import { SnapchatAdsClient } from "./snapchat";

/**
 * Factory function to create the appropriate integration client
 */
export function createIntegrationClient(
  platform: IntegrationPlatform,
  accessToken: string,
  accountId: string,
  options?: {
    refreshToken?: string;
    developerToken?: string; // For Google
  }
) {
  switch (platform) {
    case "salla":
      return new SallaClient(accessToken, options?.refreshToken);

    case "shopify":
      // accountId is the shop domain for Shopify (e.g., "my-store.myshopify.com")
      return new ShopifyClient(accessToken, accountId);

    case "meta":
      return new MetaAdsClient(accessToken, accountId, options?.refreshToken);

    case "google":
      if (!options?.developerToken) {
        throw new Error("Google Ads requires a developer token");
      }
      return new GoogleAdsClient(
        accessToken,
        accountId,
        options.developerToken,
        options.refreshToken
      );

    case "tiktok":
      return new TikTokAdsClient(accessToken, accountId);

    case "snapchat":
      return new SnapchatAdsClient(accessToken, accountId, options?.refreshToken);

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
