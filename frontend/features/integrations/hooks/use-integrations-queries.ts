'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createIntegrationsService } from '../services/integrations-service';

export function useIntegrationsQuery() {
  const apiClient = useApiClient();
  const service = createIntegrationsService(apiClient);

  return useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: () => service.getIntegrations(),
  });
}
