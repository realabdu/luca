'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient, ApiClient } from '@/lib/api';
import { getQueryClient } from '@/lib/query-client/get-query-client';
import { createContext, useContext, useMemo, ReactNode } from 'react';

const ApiClientContext = createContext<ApiClient | null>(null);

/**
 * Hook to access the API client
 * Must be used within ApiProvider
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within ApiProvider');
  }
  return client;
}

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * API Provider that wraps the application with React Query and API client context
 */
export function ApiProvider({ children }: ApiProviderProps) {
  const { getToken } = useAuth();

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.lucaserv.com',
        getToken,
        enableLogging: process.env.NODE_ENV !== 'production',
      }),
    [getToken]
  );

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ApiClientContext.Provider value={apiClient}>
        {children}
      </ApiClientContext.Provider>
    </QueryClientProvider>
  );
}

export default ApiProvider;
