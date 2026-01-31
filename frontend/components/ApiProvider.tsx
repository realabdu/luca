"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * API Provider that wraps the application with SWR configuration.
 * This replaces ConvexClientProvider for Django API access.
 */
export function ApiProvider({ children }: ApiProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error, key) => {
          if (error.status_code === 401) {
            // Handle unauthorized - Clerk should handle this
            console.error("Unauthorized request to:", key);
          }
          if (error.status_code === 403) {
            console.error("Forbidden request to:", key);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}

export default ApiProvider;
