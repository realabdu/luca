/**
 * Campaigns Domain Types
 */

export type CampaignStatus = 'Active' | 'Paused' | 'Learning' | 'Inactive';

export interface Campaign {
  id: string;
  externalId: string;
  name: string;
  platform: string;
  status: CampaignStatus;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  conversions: number;
  lastSyncAt: string | null;
}

export interface CampaignsFilters {
  search?: string;
  status?: CampaignStatus;
  platform?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignsPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Campaign[];
}

export interface SyncResult {
  success: boolean;
  results: {
    snapchat?: {
      synced: number;
      errors: string[];
    };
    [platform: string]: {
      synced: number;
      errors: string[];
    } | undefined;
  };
}
