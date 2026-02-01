'use client';

import { DateRangeSelector, type DateRange } from './DateRangeSelector';
import { getRelativeTime } from '@/lib/formatters';
import type { Integration } from '@/features/integrations/domain/types';

interface DashboardHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading: boolean;
  lastSyncAt?: number;
  fromCache?: boolean;
  integrations?: Integration[];
}

export function DashboardHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
  isLoading,
  lastSyncAt,
  fromCache,
  integrations,
}: DashboardHeaderProps) {
  const sallaConnected = integrations?.some((i) => i.platform === 'salla' && i.isConnected);
  const shopifyConnected = integrations?.some((i) => i.platform === 'shopify' && i.isConnected);
  const snapchatConnected = integrations?.some((i) => i.platform === 'snapchat' && i.isConnected);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-main tracking-tight text-balance">
          Overview
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-text-muted text-pretty">
            Real-time analytics from your connected platforms
          </p>
          {lastSyncAt && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="text-slate-300">|</span>
              {fromCache && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-text-muted">
                  <span className="material-symbols-outlined text-[12px]">cached</span>
                  Cached
                </span>
              )}
              <span>Updated {getRelativeTime(lastSyncAt)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Status Pills */}
        {integrations && (
          <ConnectionStatusPills
            sallaConnected={!!sallaConnected}
            shopifyConnected={!!shopifyConnected}
            snapchatConnected={!!snapchatConnected}
          />
        )}

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main hover:bg-slate-100 border border-border-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span
            className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            refresh
          </span>
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
      </div>
    </div>
  );
}

interface ConnectionStatusPillsProps {
  sallaConnected: boolean;
  shopifyConnected: boolean;
  snapchatConnected: boolean;
}

export function ConnectionStatusPills({ sallaConnected, shopifyConnected, snapchatConnected }: ConnectionStatusPillsProps) {
  return (
    <div className="hidden sm:flex items-center gap-2 mr-2" role="status" aria-label="Connection status">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
          sallaConnected ? 'bg-success-muted text-success' : 'bg-slate-100 text-text-muted'
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${sallaConnected ? 'bg-success' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
        Salla
      </div>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
          shopifyConnected ? 'bg-success-muted text-success' : 'bg-slate-100 text-text-muted'
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${shopifyConnected ? 'bg-success' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
        Shopify
      </div>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
          snapchatConnected ? 'bg-success-muted text-success' : 'bg-slate-100 text-text-muted'
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${snapchatConnected ? 'bg-success' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
        Snapchat
      </div>
    </div>
  );
}
