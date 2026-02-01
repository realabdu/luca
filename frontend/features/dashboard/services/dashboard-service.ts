/**
 * Dashboard Service
 * Handles dashboard-related API calls
 */

import type { ApiClient } from '@/lib/api';
import { mapDashboardDto, type DashboardDto } from '../domain/mappers';
import type { DashboardData, DashboardFilters } from '../domain/types';

export function createDashboardService(apiClient: ApiClient) {
  return {
    async getDashboard(filters: DashboardFilters): Promise<DashboardData> {
      const params: Record<string, string> = {
        start_date: filters.startDate,
        end_date: filters.endDate,
      };

      if (filters.compareEnabled && filters.compareStartDate && filters.compareEndDate) {
        params.compare = 'true';
        params.compare_start_date = filters.compareStartDate;
        params.compare_end_date = filters.compareEndDate;
      }

      if (filters.live) {
        params.live = 'true';
      }

      const dto = await apiClient.get<DashboardDto>('/dashboard/', { params });
      return mapDashboardDto(dto);
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
