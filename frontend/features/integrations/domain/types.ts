/**
 * Integrations Domain Types
 */

export type IntegrationPlatform = 'salla' | 'shopify' | 'meta' | 'google' | 'tiktok' | 'snapchat';

export interface Integration {
  id: string;
  platform: IntegrationPlatform;
  platformDisplay: string;
  accountId: string;
  accountName: string;
  isConnected: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthResponse {
  authorizationUrl: string;
}
