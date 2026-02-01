/**
 * Onboarding DTO to Domain Mappers
 */

import type { OnboardingStatus, OnboardingStatusValue } from './types';

/** DTO shape for onboarding status from the API */
export interface OnboardingStatusDto {
  status: string;
  completed_at: string | null;
  has_store_connected: boolean;
  has_ads_connected: boolean;
  connected_integrations: string[];
}

export function mapOnboardingStatusDto(dto: OnboardingStatusDto): OnboardingStatus {
  return {
    status: dto.status as OnboardingStatusValue,
    completedAt: dto.completed_at,
    hasStoreConnected: dto.has_store_connected,
    hasAdsConnected: dto.has_ads_connected,
    connectedIntegrations: dto.connected_integrations,
  };
}
