'use client';

import { PlatformIcon, type PlatformIconName } from '@/components/icons/PlatformIcons';
import type { Integration, IntegrationPlatform } from '@/features/integrations/domain/types';

interface PlatformDisplay {
  name: string;
  description: string;
  category: 'ecommerce' | 'ads';
}

interface ConnectionHealthTableProps {
  integrations: Integration[];
  platformDisplay: Record<IntegrationPlatform, PlatformDisplay>;
}

export function ConnectionHealthTable({ integrations, platformDisplay }: ConnectionHealthTableProps) {
  const connectedIntegrations = integrations.filter((i) => i.isConnected);

  if (connectedIntegrations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-4">
      <h2 className="text-xl font-bold text-text-main">Connection Health</h2>
      <div className="bg-white border border-border-light shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-border-light">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                Platform
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                Account ID
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                Last Sync
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {connectedIntegrations.map((integration) => (
              <tr key={integration.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <PlatformIcon
                      platform={integration.platform as PlatformIconName}
                      size={20}
                    />
                    <span className="font-semibold text-text-main text-sm">
                      {platformDisplay[integration.platform]?.name || integration.platform}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-text-muted">
                  {integration.accountId}
                </td>
                <td className="px-6 py-4 text-sm text-text-muted">
                  {integration.lastSyncAt
                    ? new Date(integration.lastSyncAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Pending...'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="size-1.5 bg-emerald-500 rounded-full" aria-hidden="true" />
                    Healthy
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
