import type {
  AttributionEvent,
  AttributionEventDto,
  LiveStats,
  LiveStatsDto,
} from './types';

export function mapAttributionEventDto(dto: AttributionEventDto): AttributionEvent {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    timeLabel: dto.time_label,
    amount: dto.amount,
    source: dto.source,
    campaign: dto.campaign,
    creativeUrl: dto.creative_url,
    status: dto.status,
  };
}

export function mapAttributionEventsDto(dtos: AttributionEventDto[]): AttributionEvent[] {
  return dtos.map(mapAttributionEventDto);
}

export function mapLiveStatsDto(dto: LiveStatsDto): LiveStats {
  // LiveStats has same field names, just pass through
  return {
    revenue: dto.revenue,
    orders: dto.orders,
    roas: dto.roas,
  };
}
