'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createIntegrationsService } from '../services/integrations-service';
import type { IntegrationPlatform } from '../domain/types';

export function useDisconnectIntegration() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const service = createIntegrationsService(apiClient);

  return useMutation({
    mutationFn: (integrationId: string) => service.disconnect(integrationId),
    onSuccess: () => {
      // Invalidate integrations and onboarding queries
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

export function useConnectIntegration() {
  const apiClient = useApiClient();
  const service = createIntegrationsService(apiClient);

  return useMutation({
    mutationFn: ({ platform, shopDomain }: { platform: IntegrationPlatform; shopDomain?: string }) =>
      service.getOAuthUrl(platform, shopDomain),
    onSuccess: (data) => {
      // Redirect to OAuth URL
      window.location.href = data.authorizationUrl;
    },
  });
}
