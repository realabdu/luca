'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createAttributionService } from '../services/attribution-service';
import type { AttributionFilters } from '../domain/types';

export function useAttributionEventsQuery(filters: AttributionFilters) {
  const apiClient = useApiClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const service = createAttributionService(apiClient);

  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  return useQuery({
    queryKey: queryKeys.attribution.events(filters),
    queryFn: () => service.getEvents(filters),
    enabled: canQuery,
  });
}

export function useLiveStatsQuery() {
  const apiClient = useApiClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const service = createAttributionService(apiClient);

  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  return useQuery({
    queryKey: queryKeys.attribution.stats(),
    queryFn: () => service.getLiveStats(),
    enabled: canQuery,
  });
}
