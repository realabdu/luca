/**
 * Attribution domain types (camelCase for frontend use)
 */

export interface AttributionEvent {
  id: string;
  timestamp: number;
  timeLabel: string;
  amount: number;
  source: string;
  campaign: string;
  creativeUrl: string;
  status: 'Paid' | 'Pending';
}

export interface LiveStats {
  revenue: number;
  orders: number;
  roas: string;
}

export interface AttributionFilters {
  source?: string | null;
  limit?: number;
}

/**
 * DTO types (snake_case from API)
 */

export interface AttributionEventDto {
  id: string;
  timestamp: number;
  time_label: string;
  amount: number;
  source: string;
  campaign: string;
  creative_url: string;
  status: 'Paid' | 'Pending';
}

export interface LiveStatsDto {
  revenue: number;
  orders: number;
  roas: string;
}
