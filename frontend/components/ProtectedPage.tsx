'use client';

import { type ReactNode } from 'react';
import { useAuthGuard } from '@/hooks/use-auth-guard';

interface ProtectedPageProps {
  children: ReactNode;
  /** Custom loading component */
  loadingFallback?: ReactNode;
  /** Custom component to show when no organization is selected */
  noOrgFallback?: ReactNode;
}

/**
 * Wrapper component that combines useAuthGuard with loading/error states.
 * Use this for pages that require authentication and an organization.
 *
 * @example
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedPage>
 *       <DashboardContent />
 *     </ProtectedPage>
 *   );
 * }
 */
export function ProtectedPage({
  children,
  loadingFallback,
  noOrgFallback,
}: ProtectedPageProps) {
  const { isLoading, showNoOrgMessage, canQuery } = useAuthGuard();

  // Show loading state while auth is being checked
  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return <DefaultLoadingState />;
  }

  // Show no organization message
  if (showNoOrgMessage) {
    if (noOrgFallback) {
      return <>{noOrgFallback}</>;
    }
    return <DefaultNoOrgState />;
  }

  // Not authenticated - this would typically redirect via middleware
  // but we handle it here as a fallback
  if (!canQuery) {
    return null;
  }

  return <>{children}</>;
}

function DefaultLoadingState() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"
            aria-label="Loading"
          />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    </div>
  );
}

function DefaultNoOrgState() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="size-16 bg-slate-100 flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-text-muted"
            aria-hidden="true"
          >
            business
          </span>
        </div>
        <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
        <p className="text-text-muted mb-4 max-w-md">
          Please select or create an organization to continue.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook-based approach for more control over rendering.
 * Returns the auth state and status components.
 *
 * @example
 * function MyPage() {
 *   const { canQuery, LoadingState, NoOrgState } = useProtectedPage();
 *
 *   if (!canQuery) {
 *     return <LoadingState /> || <NoOrgState />;
 *   }
 *
 *   return <MyContent />;
 * }
 */
export function useProtectedPage() {
  const auth = useAuthGuard();

  return {
    ...auth,
    LoadingState: DefaultLoadingState,
    NoOrgState: DefaultNoOrgState,
  };
}
