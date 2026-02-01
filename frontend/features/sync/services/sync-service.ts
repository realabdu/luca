/**
 * Sync Service
 * Handles data sync-related API calls
 */

import type { ApiClient } from '@/lib/api';

export interface SyncTriggerOptions {
  force?: boolean;
  days?: number;
}

export interface SyncTriggerResult {
  success: boolean;
  message: string;
}

export interface SyncStatusResult {
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastSyncAt: string | null;
  currentSync?: {
    startedAt: string;
    progress: number;
  };
}

export function createSyncService(apiClient: ApiClient) {
  return {
    async triggerSync(options: SyncTriggerOptions = {}): Promise<SyncTriggerResult> {
      return apiClient.post<SyncTriggerResult>('/sync/trigger/', options);
    },

    async getSyncStatus(): Promise<SyncStatusResult> {
      const dto = await apiClient.get<{
        status: string;
        last_sync_at: string | null;
        current_sync?: {
          started_at: string;
          progress: number;
        };
      }>('/sync/status/');

      return {
        status: dto.status as SyncStatusResult['status'],
        lastSyncAt: dto.last_sync_at,
        currentSync: dto.current_sync
          ? {
              startedAt: dto.current_sync.started_at,
              progress: dto.current_sync.progress,
            }
          : undefined,
      };
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
