'use client';

import { useAuth } from '@clerk/nextjs';
import { useOrganization } from '@clerk/nextjs';

export interface AuthGuardState {
  /** Whether both Clerk auth and organization have finished loading */
  isReady: boolean;
  /** Whether all conditions are met to make authenticated API calls */
  canQuery: boolean;
  /** Whether user is signed in but has no organization selected */
  showNoOrgMessage: boolean;
  /** Whether the user is currently loading (for showing spinners) */
  isLoading: boolean;
  /** Whether the user is signed in */
  isSignedIn: boolean | undefined;
  /** The current organization (if any) */
  organization: ReturnType<typeof useOrganization>['organization'];
}

/**
 * Custom hook that consolidates auth/org check boilerplate.
 * Use this in protected page components to determine rendering state.
 *
 * @example
 * function ProtectedPage() {
 *   const { isReady, canQuery, showNoOrgMessage, isLoading } = useAuthGuard();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (showNoOrgMessage) return <NoOrganizationMessage />;
 *   if (!canQuery) return null;
 *
 *   return <PageContent />;
 * }
 */
export function useAuthGuard(): AuthGuardState {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  const isReady = isAuthLoaded && isOrgLoaded;
  const isLoading = !isReady;
  const canQuery = isReady && !!isSignedIn && !!organization;
  const showNoOrgMessage = isReady && !!isSignedIn && !organization;

  return {
    isReady,
    canQuery,
    showNoOrgMessage,
    isLoading,
    isSignedIn,
    organization,
  };
}
