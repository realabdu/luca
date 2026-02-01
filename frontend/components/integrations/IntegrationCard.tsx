'use client';

import { PlatformIcon, PLATFORM_COLORS, type PlatformIconName } from '@/components/icons/PlatformIcons';
import type { Integration, IntegrationPlatform } from '@/features/integrations/domain/types';

interface IntegrationCardProps {
  platform: IntegrationPlatform;
  name: string;
  description: string;
  category: 'ecommerce' | 'ads';
  integration?: Integration;
  isLoading?: boolean;
  onConnect: (platform: IntegrationPlatform) => void;
  onDisconnect: (platform: IntegrationPlatform, integrationId: string) => void;
  variant?: 'large' | 'compact';
}

export function IntegrationCard({
  platform,
  name,
  description,
  category,
  integration,
  isLoading = false,
  onConnect,
  onDisconnect,
  variant = 'large',
}: IntegrationCardProps) {
  const isConnected = integration?.isConnected;

  if (variant === 'compact') {
    return (
      <CompactCard
        platform={platform}
        name={name}
        description={description}
        integration={integration}
        isLoading={isLoading}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );
  }

  return (
    <div
      className={`group relative flex flex-col p-6 border transition-colors ${
        isLoading
          ? 'bg-white border-border-light'
          : isConnected
            ? 'bg-emerald-50/30 border-emerald-100 ring-1 ring-emerald-500/10'
            : 'bg-white border-border-light'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="size-14 flex items-center justify-center shadow-sm border border-gray-100 bg-white p-2.5">
            <PlatformIcon platform={platform as PlatformIconName} size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">{name}</h3>
            <p className="text-sm text-text-muted">
              {category === 'ecommerce' ? 'Primary Datastore' : 'Ad Channel'}
            </p>
          </div>
        </div>
        {isLoading ? (
          <span className="w-16 h-6 bg-slate-100 animate-pulse" />
        ) : isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-100/50 text-emerald-700 border border-emerald-200/50 shadow-sm">
            <span className="size-2 bg-emerald-500 rounded-full" aria-hidden="true" />
            Active
          </span>
        ) : null}
      </div>

      <p className="text-sm text-text-muted mb-6 leading-relaxed">
        {isLoading ? (
          <span className="block w-48 h-4 bg-slate-100 animate-pulse" />
        ) : isConnected ? (
          `Connected to store: ${integration?.accountName}`
        ) : (
          description
        )}
      </p>

      <div className="mt-auto flex items-center gap-3">
        {isLoading ? (
          <div className="w-full h-11 bg-slate-100 animate-pulse" />
        ) : isConnected ? (
          <>
            <button className="flex-1 h-10 bg-white border border-border-light text-text-main text-sm font-semibold shadow-sm">
              Sync Catalog
            </button>
            <button
              onClick={() => onDisconnect(platform, integration!.id)}
              className="h-10 px-4 border border-red-100 text-red-600 bg-red-50/50"
              aria-label={`Disconnect ${name}`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                link_off
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(platform)}
            className="w-full h-11 bg-primary text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add_link
            </span>
            Connect Store
          </button>
        )}
      </div>
    </div>
  );
}

interface CompactCardProps {
  platform: IntegrationPlatform;
  name: string;
  description: string;
  integration?: Integration;
  isLoading?: boolean;
  onConnect: (platform: IntegrationPlatform) => void;
  onDisconnect: (platform: IntegrationPlatform, integrationId: string) => void;
}

function CompactCard({
  platform,
  name,
  description,
  integration,
  isLoading = false,
  onConnect,
  onDisconnect,
}: CompactCardProps) {
  const isConnected = integration?.isConnected;

  return (
    <div
      className={`group flex flex-col p-5 border ${
        isConnected
          ? 'bg-white border-border-light shadow-sm'
          : 'bg-white border-border-light'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className="size-12 flex items-center justify-center border border-gray-100/50 p-2"
          style={{ backgroundColor: `${PLATFORM_COLORS[platform]}08` }}
        >
          <PlatformIcon platform={platform as PlatformIconName} size={28} />
        </div>
        {isLoading ? (
          <span className="size-2.5 bg-slate-200 animate-pulse rounded-full" />
        ) : isConnected ? (
          <span className="size-2.5 bg-emerald-500 rounded-full" aria-label="Connected" />
        ) : null}
      </div>

      <h3 className="font-bold text-text-main mb-1">{name}</h3>
      <p className="text-xs text-text-muted h-8 mb-4 line-clamp-2">
        {isLoading ? (
          <span className="block w-24 h-3 bg-slate-100 animate-pulse" />
        ) : isConnected ? (
          `Connected: ${integration?.accountName}`
        ) : (
          description
        )}
      </p>

      {isLoading ? (
        <div className="mt-auto w-full h-9 bg-slate-100 animate-pulse" />
      ) : isConnected ? (
        <div className="mt-auto flex gap-2">
          <button className="flex-1 h-9 bg-gray-50 text-text-main text-xs font-bold border border-gray-200/50">
            Manage
          </button>
          <button
            onClick={() => onDisconnect(platform, integration!.id)}
            className="h-9 px-2.5 border border-border-light text-text-muted bg-white"
            aria-label={`Disconnect ${name}`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              link_off
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConnect(platform)}
          className="mt-auto w-full h-9 border border-primary/20 text-primary text-xs font-bold bg-primary/5"
        >
          Connect
        </button>
      )}
    </div>
  );
}

export function ComingSoonCard({ name }: { name: string }) {
  return (
    <div className="group flex flex-col p-6 border border-dashed border-border-light bg-slate-50/50">
      <div className="flex items-center gap-4 mb-4 opacity-50">
        <div className="size-14 flex items-center justify-center bg-white border border-border-light p-3 grayscale">
          <span className="material-symbols-outlined text-[32px] text-gray-400" aria-hidden="true">
            store
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-muted">{name}</h3>
          <p className="text-sm text-text-muted">E-commerce</p>
        </div>
      </div>
      <div className="mt-auto">
        <button
          disabled
          className="w-full h-11 border border-border-light bg-transparent text-text-muted text-sm font-semibold cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}
