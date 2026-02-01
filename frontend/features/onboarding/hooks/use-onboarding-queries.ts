'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createOnboardingService } from '../services/onboarding-service';

export function useOnboardingStatusQuery() {
  const apiClient = useApiClient();
  const service = createOnboardingService(apiClient);

  return useQuery({
    queryKey: queryKeys.onboarding.status(),
    queryFn: () => service.getStatus(),
  });
}

export function useSkipAds() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const service = createOnboardingService(apiClient);

  return useMutation({
    mutationFn: () => service.skipAds(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

export function useCompleteOnboarding() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const service = createOnboardingService(apiClient);

  return useMutation({
    mutationFn: () => service.complete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
