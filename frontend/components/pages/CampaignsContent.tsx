'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useApiQuery, Campaign, PaginatedResponse } from '@/lib/api-client';

import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { IntegrationPlatform } from "@/types/integrations";

const ITEMS_PER_PAGE = 20;

type StatusFilter = 'Active' | 'Paused' | 'Learning' | 'Inactive' | undefined;
type PlatformFilter = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'X' | 'Klaviyo' | undefined;

interface SyncResult {
  success: boolean;
  results: {
    snapchat: {
      synced: number;
      errors: string[];
    };
  };
}

export default function CampaignsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active'); // Default to Active
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  // Only query when authenticated and organization is selected
  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  // Build query params
  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.set('search', searchTerm);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (platformFilter) queryParams.set('platform', platformFilter);
  queryParams.set('limit', String(ITEMS_PER_PAGE));
  queryParams.set('offset', String(currentPage * ITEMS_PER_PAGE));

  const { data: campaignsData } = useApiQuery<PaginatedResponse<Campaign>>(
    canQuery ? `/campaigns/?${queryParams.toString()}` : null
  );

  const campaigns = campaignsData?.results ?? [];
  const total = campaignsData?.count ?? 0;
  const hasMore = !!campaignsData?.next;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, statusFilter, platformFilter]);

  // Sync campaigns from connected platforms
  const syncCampaigns = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/campaigns/sync', { method: 'POST' });
      const data: SyncResult = await response.json();

      if (data.success) {
        const totalSynced = data.results.snapchat.synced;
        const errors = data.results.snapchat.errors;

        if (totalSynced > 0) {
          setSyncStatus(`Synced ${totalSynced} campaign${totalSynced > 1 ? 's' : ''}`);
        } else if (errors.length > 0) {
          setSyncStatus(errors[0]);
        } else {
          setSyncStatus('No new campaigns');
        }
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('Sync failed');
      }
    } catch (error) {
      setSyncStatus('Failed to sync');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: undefined, label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Paused', label: 'Paused' },
    { value: 'Learning', label: 'Learning' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const platformOptions: { value: PlatformFilter; label: string }[] = [
    { value: undefined, label: 'All Platforms' },
    { value: 'Snapchat', label: 'Snapchat' },
    { value: 'Meta', label: 'Meta' },
    { value: 'Google', label: 'Google' },
    { value: 'TikTok', label: 'TikTok' },
    { value: 'X', label: 'X' },
  ];

  // Show loading state while checking organization
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if signed in but no organization selected
  if (isSignedIn && !organization) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-16 bg-warning/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-warning">domain_add</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
            <p className="text-sm text-text-muted max-w-md">
              Please select or create an organization from the organization switcher to view your campaigns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight text-balance">Campaigns</h1>
          <p className="text-sm text-text-muted mt-1">
            {total > 0 ? `${total} campaigns` : 'No campaigns'}
            {statusFilter ? ` (${statusFilter})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus && (
            <span className={`text-xs px-2.5 py-1 font-medium ${
              syncStatus.includes('Synced') ? 'bg-success-muted text-success' :
              syncStatus.includes('No new') ? 'bg-slate-100 text-text-muted' :
              'bg-warning/10 text-warning'
            }`}>
              {syncStatus}
            </span>
          )}
          {lastSyncTime && (
            <span className="text-xs text-text-muted">
              {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={syncCampaigns}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
              {isSyncing ? 'progress_activity' : 'sync'}
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-border-light">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted material-symbols-outlined text-[20px]">search</span>
            <input
              className="w-full border border-border-light bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              placeholder="Search campaigns..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="h-8 w-px bg-border-light hidden sm:block"></div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPlatformDropdown(false); }}
              className={`flex items-center gap-2 border px-3 py-2.5 text-sm font-medium transition-all ${
                statusFilter ? 'border-primary bg-primary/5 text-primary' : 'border-border-light bg-white text-text-main hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span>{statusFilter || 'All Status'}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-border-light shadow-xl z-10 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {statusOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => { setStatusFilter(option.value); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                      statusFilter === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-main'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowPlatformDropdown(!showPlatformDropdown); setShowStatusDropdown(false); }}
              className={`flex items-center gap-2 border px-3 py-2.5 text-sm font-medium transition-all ${
                platformFilter ? 'border-primary bg-primary/5 text-primary' : 'border-border-light bg-white text-text-main hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">devices</span>
              <span>{platformFilter || 'All Platforms'}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            {showPlatformDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-border-light shadow-xl z-10 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {platformOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => { setPlatformFilter(option.value); setShowPlatformDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                      platformFilter === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-main'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border-light bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-border-light bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Campaign</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Spend</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Revenue</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-primary">ROAS</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">CPA</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light text-sm">
              {campaignsData === undefined ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
                      <p className="text-sm text-text-muted">Loading campaigns...</p>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-14 bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px] text-text-muted">campaign</span>
                      </div>
                      <p className="text-sm text-text-muted">
                        {statusFilter ? `No ${statusFilter.toLowerCase()} campaigns found.` : 'No campaigns found.'}
                      </p>
                      {statusFilter && (
                        <button
                          onClick={() => setStatusFilter(undefined)}
                          className="text-sm text-primary font-medium hover:underline"
                        >
                          Show all campaigns
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center bg-slate-50 shrink-0">
                          <PlatformIcon platform={campaign.platform.toLowerCase() as IntegrationPlatform} size={22} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-text-main truncate max-w-[280px]">{campaign.name}</span>
                          <span className="text-xs text-text-muted">
                            {campaign.external_id ? `${campaign.external_id.slice(0, 16)}...` : `ID: ${campaign.id.slice(0, 8)}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold ${
                        campaign.status === 'Active' ? 'bg-success-muted text-success' :
                        campaign.status === 'Learning' ? 'bg-warning/10 text-warning' :
                        'bg-slate-100 text-text-muted'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-text-main tabular-nums">
                      {campaign.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-text-main tabular-nums">
                      {campaign.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2.5 py-1 font-bold tabular-nums ${campaign.roas > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-text-muted'}`}>
                        {campaign.roas.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-text-muted tabular-nums">
                      {campaign.cpa > 0 ? `${campaign.cpa.toFixed(2)} SAR` : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        aria-label="Campaign options"
                        className="p-2 text-text-muted hover:text-text-main hover:bg-slate-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border-light bg-slate-50/30 px-6 py-3">
          <div className="text-xs text-text-muted">
            {total > 0 ? (
              <>
                Showing <span className="font-medium text-text-main">{currentPage * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-medium text-text-main">{Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)}</span> of{' '}
                <span className="font-medium text-text-main">{total}</span> campaigns
              </>
            ) : (
              'No campaigns to display'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center justify-center border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-text-muted px-2">
              Page {currentPage + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="flex items-center justify-center border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
