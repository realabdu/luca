'use client';

import { useState } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { IntegrationPlatform } from "@/types/integrations";
import { useAttributionEventsQuery, useLiveStatsQuery } from '@/features/attribution/hooks/use-attribution-queries';
import type { AttributionEvent } from '@/features/attribution/domain/types';

// Fallback data for when API is loading or empty
const FALLBACK_EVENTS: AttributionEvent[] = [
  { id: '1', timestamp: Date.now(), timeLabel: 'Just now', amount: 450, source: 'TikTok', campaign: 'Summer_Sale_v2', creativeUrl: 'https://picsum.photos/id/1/200/120', status: 'Paid' },
  { id: '2', timestamp: Date.now() - 4 * 60000, timeLabel: '4m', amount: 120.50, source: 'Google', campaign: '"best perfumes"', creativeUrl: '', status: 'Pending' },
  { id: '3', timestamp: Date.now() - 12 * 60000, timeLabel: '12m', amount: 990, source: 'Snapchat', campaign: 'Influencer_Pack', creativeUrl: 'https://picsum.photos/id/2/200/120', status: 'Paid' },
  { id: '4', timestamp: Date.now() - 15 * 60000, timeLabel: '15m', amount: 230, source: 'Meta', campaign: 'Retargeting_Q3', creativeUrl: 'https://picsum.photos/id/3/200/120', status: 'Paid' },
];

type SourceFilter = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'X' | 'Klaviyo' | null;

export default function LiveFeedContent() {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceFilter>(null);
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  // Use new React Query hooks
  const { data: eventsData } = useAttributionEventsQuery({
    source: selectedSource,
    limit: 10,
  });
  const { data: recentStats } = useLiveStatsQuery();

  const events = eventsData?.length ? eventsData : FALLBACK_EVENTS;
  const stats = recentStats || { revenue: 4200, orders: 12, roas: '3.8' };

  const platforms = ['TikTok', 'Google', 'Snapchat', 'Meta'] as const;

  // Show loading state while checking organization
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-text-muted animate-spin">progress_activity</span>
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if signed in but no organization selected
  if (isSignedIn && !organization) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-16 bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-amber-600">domain_add</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
            <p className="text-sm text-text-muted max-w-md">
              Please select or create an organization from the organization switcher to view your live attribution feed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-text-main tracking-tight text-balance">Live Attribution Feed</h1>
            </div>
            <p className="text-sm text-text-muted text-pretty">Real-time sales tracking via Ruwad Pixel.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume feed' : 'Pause feed'}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light text-sm font-semibold text-text-main shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">{isPaused ? 'play_arrow' : 'pause'}</span>
              {isPaused ? 'Resume Feed' : 'Pause Feed'}
            </button>
            <button
              aria-label="Configure pixel settings"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Configure Pixel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pb-2 border-b border-border-light/50">
          <button
            onClick={() => setSelectedSource(null)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
              selectedSource === null
                ? 'bg-primary text-white'
                : 'bg-white border border-border-light text-text-muted'
            }`}
          >
            All Channels
          </button>
          {platforms.map(p => (
            <button
              key={p}
              onClick={() => setSelectedSource(selectedSource === p ? null : p as SourceFilter)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                selectedSource === p
                  ? 'bg-primary text-white'
                  : 'bg-white border border-border-light text-text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 relative">
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border-light -z-10 hidden md:block"></div>
          {events.map((event, index) => (
            <div key={event.id} className={`group relative flex gap-4 md:gap-6 items-start ${index > 5 ? 'opacity-50' : 'opacity-100'}`}>
              <div className="hidden md:flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-white border border-border-light shadow-sm z-10">
                <span className={`text-xs font-bold uppercase tracking-wider ${event.timeLabel === 'Just now' ? 'text-primary' : 'text-text-muted'}`}>{event.timeLabel}</span>
              </div>
              <div className="flex-1 bg-white p-5 border border-border-light shadow-sm cursor-pointer">
                <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold">#{event.id.slice(0, 4)}</span>
                    <span className="text-text-muted text-sm font-medium">{event.timeLabel}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${event.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-text-main tracking-tight tabular-nums">SAR {event.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-light/50">
                  <div className="flex items-center gap-3">
                    <div className="size-10 flex items-center justify-center shrink-0 border border-border-light bg-white">
                      <PlatformIcon platform={event.source.toLowerCase() as IntegrationPlatform} size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-0.5">Source</p>
                      <p className="text-sm font-bold text-text-main">{event.source} Ads</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 mx-1" style={{ fontSize: 16 }}>arrow_forward</span>
                    <div>
                      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-0.5">Campaign</p>
                      <p className="text-sm font-medium text-text-main truncate max-w-[120px]">{event.campaign}</p>
                    </div>
                  </div>
                  <div className="flex items-center md:justify-end gap-3">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-0.5">Ad Creative</p>
                      <p className="text-xs text-primary font-medium">View Details</p>
                    </div>
                    <div className="h-12 w-20 bg-slate-100 overflow-hidden border border-border-light relative group/image">
                      {event.creativeUrl ? (
                        <img src={event.creativeUrl} alt="Ad Creative" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                           <span className="material-symbols-outlined">description</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full py-4 border border-dashed border-border-light text-text-muted text-sm font-medium">
          Load older transactions
        </button>
      </div>

      <div className="w-full lg:w-[360px] flex flex-col gap-6 shrink-0">
        <div className="bg-white border border-border-light p-1 shadow-sm sticky top-6">
          <div className="p-4 pb-2 flex justify-between items-center">
            <h3 className="font-bold text-text-main">Last Hour Performance</h3>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              Live
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-slate-50 p-4 flex flex-col gap-1">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Revenue</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-text-main">
                  {stats.revenue >= 1000 ? `${(stats.revenue / 1000).toFixed(1)}k` : stats.revenue.toFixed(0)}
                </span>
                <span className="text-xs font-medium text-text-muted">SAR</span>
              </div>
              <span className="text-xs font-medium text-green-600">+22% vs avg</span>
            </div>
            <div className="bg-slate-50 p-4 flex flex-col gap-1">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Orders</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-text-main">{stats.orders}</span>
              </div>
              <span className="text-xs font-medium text-green-600">+15% vs avg</span>
            </div>
            <div className="bg-slate-50 p-4 flex flex-col gap-1 col-span-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Real-time ROAS</span>
                  <span className="text-3xl font-black text-primary">{stats.roas}x</span>
                </div>
                <div className="h-8 w-24">
                  <svg className="w-full h-full stroke-primary fill-none stroke-2" viewBox="0 0 100 40">
                    <path d="M0 35 Q 20 30, 40 20 T 100 5"></path>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-medium text-text-muted mt-1">Return on Ad Spend (Live)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
