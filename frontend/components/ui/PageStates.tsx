'use client';

import type { ReactNode } from 'react';

interface PageLoadingProps {
  maxWidth?: string;
}

/**
 * Full-page loading spinner for auth/data loading states.
 */
export function PageLoading({ maxWidth = 'max-w-[1600px]' }: PageLoadingProps): JSX.Element {
  return (
    <div className={`p-6 lg:p-8 ${maxWidth} mx-auto`}>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    </div>
  );
}

interface NoOrganizationProps {
  maxWidth?: string;
  message?: string;
}

/**
 * Message displayed when user has no organization selected.
 */
export function NoOrganization({
  maxWidth = 'max-w-[1600px]',
  message = 'Please select or create an organization to continue.',
}: NoOrganizationProps): JSX.Element {
  return (
    <div className={`p-6 lg:p-8 ${maxWidth} mx-auto`}>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="size-16 bg-warning/10 flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-warning"
            aria-hidden="true"
          >
            domain_add
          </span>
        </div>
        <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
        <p className="text-text-muted max-w-md">{message}</p>
      </div>
    </div>
  );
}
