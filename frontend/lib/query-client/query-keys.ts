/**
 * Query Keys Factory
 * Centralized query key management for React Query
 */

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: (filters: { startDate: string; endDate: string }) =>
      [...queryKeys.dashboard.all, 'summary', filters] as const,
  },

  integrations: {
    all: ['integrations'] as const,
    list: () => [...queryKeys.integrations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.integrations.all, 'detail', { id }] as const,
  },

  campaigns: {
    all: ['campaigns'] as const,
    list: (filters: { search?: string; status?: string; platform?: string; limit?: number; offset?: number }) =>
      [...queryKeys.campaigns.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.campaigns.all, 'detail', { id }] as const,
  },

  sync: {
    all: ['sync'] as const,
    status: () => [...queryKeys.sync.all, 'status'] as const,
  },

  onboarding: {
    all: ['onboarding'] as const,
    status: () => [...queryKeys.onboarding.all, 'status'] as const,
  },

  organization: {
    all: ['organization'] as const,
    current: () => [...queryKeys.organization.all, 'current'] as const,
    members: () => [...queryKeys.organization.all, 'members'] as const,
  },

  attribution: {
    all: ['attribution'] as const,
    events: (filters: { source?: string | null; limit?: number }) =>
      [...queryKeys.attribution.all, 'events', filters] as const,
    stats: () => [...queryKeys.attribution.all, 'stats'] as const,
  },
} as const;
