/**
 * Onboarding Service
 * Handles onboarding-related API calls
 */

import type { ApiClient } from '@/lib/api';
import { mapOnboardingStatusDto, type OnboardingStatusDto } from '../domain/mappers';
import type { OnboardingStatus } from '../domain/types';

export function createOnboardingService(apiClient: ApiClient) {
  return {
    async getStatus(): Promise<OnboardingStatus> {
      const dto = await apiClient.get<OnboardingStatusDto>('/onboarding/status/');
      return mapOnboardingStatusDto(dto);
    },

    async skipAds(): Promise<void> {
      await apiClient.post('/onboarding/skip-ads/');
    },

    async complete(): Promise<void> {
      await apiClient.post('/onboarding/complete/');
    },
  };
}

export type OnboardingService = ReturnType<typeof createOnboardingService>;
