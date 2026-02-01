/**
 * Campaigns DTO to Domain Mappers
 */

import type { Campaign, CampaignsPaginatedResponse, CampaignStatus } from './types';

/** DTO shape for individual campaign from the API */
export interface CampaignDto {
  id: string;
  external_id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  conversions: number;
  last_sync_at: string | null;
}

/** DTO shape for paginated campaigns response from the API */
export interface CampaignsPaginatedDto {
  count: number;
  next: string | null;
  previous: string | null;
  results: CampaignDto[];
}

export function mapCampaignDto(dto: CampaignDto): Campaign {
  return {
    id: dto.id,
    externalId: dto.external_id,
    name: dto.name,
    platform: dto.platform,
    status: dto.status as CampaignStatus,
    spend: dto.spend,
    revenue: dto.revenue,
    roas: dto.roas,
    cpa: dto.cpa,
    impressions: dto.impressions,
    clicks: dto.clicks,
    conversions: dto.conversions,
    lastSyncAt: dto.last_sync_at,
  };
}

export function mapCampaignsPaginatedDto(dto: CampaignsPaginatedDto): CampaignsPaginatedResponse {
  return {
    count: dto.count,
    next: dto.next,
    previous: dto.previous,
    results: dto.results.map(mapCampaignDto),
  };
}
