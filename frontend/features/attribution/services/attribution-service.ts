import type { ApiClient } from '@/lib/api';
import { mapAttributionEventsDto, mapLiveStatsDto } from '../domain/mappers';
import type {
  AttributionEvent,
  AttributionEventDto,
  AttributionFilters,
  LiveStats,
  LiveStatsDto,
} from '../domain/types';

export function createAttributionService(apiClient: ApiClient) {
  return {
    async getEvents(filters: AttributionFilters): Promise<AttributionEvent[]> {
      const params = new URLSearchParams();
      if (filters.source) params.set('source', filters.source);
      if (filters.limit) params.set('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = queryString ? `/attribution/events/?${queryString}` : '/attribution/events/';

      const dtos = await apiClient.get<AttributionEventDto[]>(url);
      return mapAttributionEventsDto(dtos);
    },

    async getLiveStats(): Promise<LiveStats> {
      const dto = await apiClient.get<LiveStatsDto>('/attribution/stats/');
      return mapLiveStatsDto(dto);
    },
  };
}
