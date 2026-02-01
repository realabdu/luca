'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createOrganizationService } from '../services/organization-service';

export function useCurrentOrganizationQuery() {
  const apiClient = useApiClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { organization: clerkOrg, isLoaded: isOrgLoaded } = useOrganization();
  const service = createOrganizationService(apiClient);

  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!clerkOrg;

  return useQuery({
    queryKey: queryKeys.organization.current(),
    queryFn: () => service.getCurrentOrganization(),
    enabled: canQuery,
  });
}

export function useOrganizationMembersQuery() {
  const apiClient = useApiClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { organization: clerkOrg, isLoaded: isOrgLoaded } = useOrganization();
  const service = createOrganizationService(apiClient);

  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!clerkOrg;

  return useQuery({
    queryKey: queryKeys.organization.members(),
    queryFn: () => service.getMembers(),
    enabled: canQuery,
  });
}
