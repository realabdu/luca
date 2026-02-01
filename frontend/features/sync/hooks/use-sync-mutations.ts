'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createSyncService, SyncTriggerOptions } from '../services/sync-service';

export function useSyncStatus() {
  const apiClient = useApiClient();
  const service = createSyncService(apiClient);

  return useQuery({
    queryKey: queryKeys.sync.status(),
    queryFn: () => service.getSyncStatus(),
    refetchInterval: (query) => {
      // Poll every 5 seconds while sync is running
      if (query.state.data?.status === 'running') {
        return 5000;
      }
      return false;
    },
  });
}

export function useTriggerSync() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const service = createSyncService(apiClient);

  return useMutation({
    mutationFn: (options: SyncTriggerOptions = {}) => service.triggerSync(options),
    onSuccess: () => {
      // Invalidate sync status and dashboard queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
