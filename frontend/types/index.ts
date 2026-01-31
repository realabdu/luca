export enum Platform {
  Meta = 'Meta',
  Google = 'Google',
  TikTok = 'TikTok',
  Snapchat = 'Snapchat',
  X = 'X',
  Klaviyo = 'Klaviyo'
}

export interface MetricCardData {
  label: string;
  value: string;
  unit?: string;
  trend: number;
  trendLabel: string;
  icon: string;
  trendType: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  status: 'Active' | 'Paused' | 'Learning' | 'Inactive';
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface AttributionEvent {
  id: string;
  timestamp: string;
  timeLabel: string;
  amount: number;
  source: Platform;
  campaign: string;
  creativeUrl: string;
  status: 'Paid' | 'Pending';
}
