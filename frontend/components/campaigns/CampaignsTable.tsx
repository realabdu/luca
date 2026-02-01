'use client';

import { PlatformIcon, type PlatformIconName } from '@/components/icons/PlatformIcons';
import type { Campaign, CampaignStatus } from '@/features/campaigns/domain/types';

interface CampaignsTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  statusFilter?: CampaignStatus;
  onClearFilter?: () => void;
}

export function CampaignsTable({
  campaigns,
  isLoading,
  statusFilter,
  onClearFilter,
}: CampaignsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-border-light bg-slate-50/50">
            <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Campaign
            </th>
            <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Status
            </th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
              Spend
            </th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
              Revenue
            </th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-primary">
              ROAS
            </th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
              CPA
            </th>
            <th scope="col" className="px-4 py-4 w-10">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light text-sm">
          {isLoading ? (
            <LoadingRow />
          ) : campaigns.length === 0 ? (
            <EmptyRow statusFilter={statusFilter} onClearFilter={onClearFilter} />
          ) : (
            campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoadingRow() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-text-muted">Loading campaigns...</p>
        </div>
      </td>
    </tr>
  );
}

interface EmptyRowProps {
  statusFilter?: CampaignStatus;
  onClearFilter?: () => void;
}

function EmptyRow({ statusFilter, onClearFilter }: EmptyRowProps) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-14 bg-slate-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-text-muted" aria-hidden="true">
              campaign
            </span>
          </div>
          <p className="text-sm text-text-muted">
            {statusFilter ? `No ${statusFilter.toLowerCase()} campaigns found.` : 'No campaigns found.'}
          </p>
          {statusFilter && onClearFilter && (
            <button
              onClick={onClearFilter}
              className="text-sm text-primary font-medium hover:underline"
            >
              Show all campaigns
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface CampaignRowProps {
  campaign: Campaign;
}

function CampaignRow({ campaign }: CampaignRowProps) {
  const platformKey = campaign.platform.toLowerCase() as PlatformIconName;

  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center bg-slate-50 shrink-0">
            <PlatformIcon platform={platformKey} size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-text-main truncate max-w-[280px]">
              {campaign.name}
            </span>
            <span className="text-xs text-text-muted">
              {campaign.externalId
                ? `${campaign.externalId.slice(0, 16)}...`
                : `ID: ${campaign.id.slice(0, 8)}`}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={campaign.status} />
      </td>
      <td className="px-6 py-4 text-right font-medium text-text-main tabular-nums">
        {campaign.spend.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        SAR
      </td>
      <td className="px-6 py-4 text-right font-medium text-text-main tabular-nums">
        {campaign.revenue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        SAR
      </td>
      <td className="px-6 py-4 text-right">
        <span
          className={`inline-block px-2.5 py-1 font-bold tabular-nums ${
            campaign.roas > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-text-muted'
          }`}
        >
          {campaign.roas.toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-text-muted tabular-nums">
        {campaign.cpa > 0 ? `${campaign.cpa.toFixed(2)} SAR` : '-'}
      </td>
      <td className="px-4 py-4 text-right">
        <button
          aria-label={`Options for ${campaign.name}`}
          className="p-2 text-text-muted hover:text-text-main hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            more_horiz
          </span>
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const statusClasses = {
    Active: 'bg-success-muted text-success',
    Learning: 'bg-warning/10 text-warning',
    Paused: 'bg-slate-100 text-text-muted',
    Inactive: 'bg-slate-100 text-text-muted',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold ${
        statusClasses[status] || 'bg-slate-100 text-text-muted'
      }`}
    >
      {status}
    </span>
  );
}
