'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createCampaignsService } from '../services/campaigns-service';
import type { CampaignsFilters } from '../domain/types';

export function useCampaignsQuery(filters: CampaignsFilters) {
  const apiClient = useApiClient();
  const service = createCampaignsService(apiClient);

  return useQuery({
    queryKey: queryKeys.campaigns.list(filters),
    queryFn: () => service.getCampaigns(filters),
  });
}

export function useSyncCampaigns() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const service = createCampaignsService(apiClient);

  return useMutation({
    mutationFn: () => service.syncCampaigns(),
    onSuccess: () => {
      // Invalidate campaigns queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}
