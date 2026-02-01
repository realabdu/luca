/**
 * Onboarding Domain Types
 */

export type OnboardingStatusValue = 'pending' | 'store_connected' | 'ads_connected' | 'completed';

export interface OnboardingStatus {
  status: OnboardingStatusValue;
  completedAt: string | null;
  hasStoreConnected: boolean;
  hasAdsConnected: boolean;
  connectedIntegrations: string[];
}
