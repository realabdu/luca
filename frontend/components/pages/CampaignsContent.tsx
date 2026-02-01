'use client';

import { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { PageLoading, NoOrganization } from '@/components/ui';
import { CampaignsFilters } from '@/components/campaigns/CampaignsFilters';
import { CampaignsTable } from '@/components/campaigns/CampaignsTable';
import { Pagination } from '@/components/campaigns/Pagination';
import { useCampaignsQuery, useSyncCampaigns } from '@/features/campaigns/hooks/use-campaigns-queries';
import type { CampaignStatus } from '@/features/campaigns/domain/types';

const ITEMS_PER_PAGE = 20;

type StatusFilter = CampaignStatus | undefined;
type PlatformFilter = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'X' | 'Klaviyo' | undefined;

export default function CampaignsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const { isLoading: isAuthLoading, canQuery, showNoOrgMessage } = useAuthGuard();

  const { data: campaignsData, isLoading } = useCampaignsQuery({
    search: searchTerm || undefined,
    status: statusFilter,
    platform: platformFilter,
    limit: ITEMS_PER_PAGE,
    offset: currentPage * ITEMS_PER_PAGE,
  });

  const { mutate: syncCampaigns, isPending: isSyncing } = useSyncCampaigns();

  const campaigns = campaignsData?.results ?? [];
  const total = campaignsData?.count ?? 0;
  const hasMore = !!campaignsData?.next;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, statusFilter, platformFilter]);

  const handleSyncCampaigns = () => {
    setSyncStatus(null);
    syncCampaigns(undefined, {
      onSuccess: (data) => {
        const totalSynced = data.results.snapchat?.synced ?? 0;
        const errors = data.results.snapchat?.errors ?? [];
        if (totalSynced > 0) {
          setSyncStatus(`Synced ${totalSynced} campaign${totalSynced > 1 ? 's' : ''}`);
        } else if (errors.length > 0) {
          setSyncStatus(errors[0]);
        } else {
          setSyncStatus('No new campaigns');
        }
        setLastSyncTime(new Date());
      },
      onError: () => {
        setSyncStatus('Sync failed');
      },
    });
  };

  if (isAuthLoading) {
    return <PageLoading maxWidth="max-w-7xl" />;
  }

  if (showNoOrgMessage) {
    return <NoOrganization maxWidth="max-w-7xl" message="Please select or create an organization from the organization switcher to view your campaigns." />;
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
            <span
              role="status"
              className={`text-xs px-2.5 py-1 font-medium ${
                syncStatus.includes('Synced')
                  ? 'bg-success-muted text-success'
                  : syncStatus.includes('No new')
                    ? 'bg-slate-100 text-text-muted'
                    : 'bg-warning/10 text-warning'
              }`}
            >
              {syncStatus}
            </span>
          )}
          {lastSyncTime && (
            <span className="text-xs text-text-muted">{lastSyncTime.toLocaleTimeString()}</span>
          )}
          <button
            onClick={handleSyncCampaigns}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            >
              {isSyncing ? 'progress_activity' : 'sync'}
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      <CampaignsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformChange={setPlatformFilter}
      />

      <div className="border border-border-light bg-white overflow-hidden">
        <CampaignsTable
          campaigns={campaigns}
          isLoading={isLoading}
          statusFilter={statusFilter}
          onClearFilter={() => setStatusFilter(undefined)}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={ITEMS_PER_PAGE}
          hasNext={hasMore}
          onPageChange={setCurrentPage}
          itemLabel="campaigns"
        />
      </div>
    </div>
  );
}

