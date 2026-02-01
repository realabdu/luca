/**
 * Query Client Singleton
 * Provides a single QueryClient instance for the application
 */

import { QueryClient } from '@tanstack/react-query';
import { isApiError, ApiAuthError } from '@/lib/api';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 60 seconds
        staleTime: 60 * 1000,
        // Keep unused data for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry on network errors, but not on auth errors
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (isApiError(error) && error instanceof ApiAuthError) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        // Don't refetch on window focus by default
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Don't retry mutations by default
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  // Server: always make a new query client
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  // Browser: reuse the same query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
