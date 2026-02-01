/**
 * Campaigns Service
 * Handles campaign-related API calls
 */

import type { ApiClient } from '@/lib/api';
import { mapCampaignsPaginatedDto, type CampaignsPaginatedDto } from '../domain/mappers';
import type { CampaignsPaginatedResponse, CampaignsFilters, SyncResult } from '../domain/types';

export function createCampaignsService(apiClient: ApiClient) {
  return {
    async getCampaigns(filters: CampaignsFilters): Promise<CampaignsPaginatedResponse> {
      const params: Record<string, string | number> = {};

      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.platform) params.platform = filters.platform;
      if (filters.limit !== undefined) params.limit = filters.limit;
      if (filters.offset !== undefined) params.offset = filters.offset;

      const dto = await apiClient.get<CampaignsPaginatedDto>('/campaigns/', { params });
      return mapCampaignsPaginatedDto(dto);
    },

    async syncCampaigns(): Promise<SyncResult> {
      return apiClient.post<SyncResult>('/campaigns/sync/');
    },

    async getSyncStatus(): Promise<{ status: string; lastSyncAt: string | null }> {
      return apiClient.get('/campaigns/sync/status/');
    },
  };
}

export type CampaignsService = ReturnType<typeof createCampaignsService>;
