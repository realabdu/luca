'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/providers/ApiProvider';
import { queryKeys } from '@/lib/query-client/query-keys';
import { createDashboardService } from '../services/dashboard-service';
import type { DashboardFilters } from '../domain/types';

export function useDashboardQuery(filters: DashboardFilters) {
  const apiClient = useApiClient();
  const service = createDashboardService(apiClient);

  return useQuery({
    queryKey: queryKeys.dashboard.summary({
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    queryFn: () => service.getDashboard(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}
