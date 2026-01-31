"use client";

import useSWR, { SWRConfiguration, SWRResponse, mutate as globalMutate } from "swr";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";

// API Configuration - default to production URL since env vars may not be available in Cloudflare
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";
const API_VERSION = "/api/v1";

// Types
export interface ApiError {
  message: string;
  status_code: number;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Helper to build full API URL
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${API_VERSION}${cleanPath}`;
}

// Fetcher with Clerk auth token
async function fetchWithAuth(
  url: string,
  token: string | null,
  options: RequestInit = {}
): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Merge any additional headers from options
  if (options.headers) {
    const optHeaders = new Headers(options.headers);
    optHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: response.statusText,
      status_code: response.status,
    }));
    throw error;
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

/**
 * Hook for fetching data from the API with SWR.
 * Automatically attaches Clerk JWT token.
 */
export function useApiQuery<T>(
  path: string | null,
  config?: SWRConfiguration
): SWRResponse<T, ApiError> {
  const { getToken } = useAuth();

  const fetcher = async (url: string) => {
    const token = await getToken();
    return fetchWithAuth(url, token);
  };

  return useSWR<T, ApiError>(
    path ? apiUrl(path) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}

/**
 * Hook for paginated queries.
 */
export function usePaginatedQuery<T>(
  path: string | null,
  config?: SWRConfiguration
): SWRResponse<PaginatedResponse<T>, ApiError> & {
  items: T[];
  hasMore: boolean;
} {
  const response = useApiQuery<PaginatedResponse<T>>(path, config);

  return {
    ...response,
    items: response.data?.results || [],
    hasMore: !!response.data?.next,
  };
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE).
 */
export function useApiMutation<TInput = unknown, TOutput = unknown>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (data?: TInput): Promise<TOutput> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const result = await fetchWithAuth(apiUrl(path), token, {
          method,
          body: data ? JSON.stringify(data) : undefined,
        });
        return result as TOutput;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken, path, method]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}

/**
 * Invalidate cache for a specific path.
 */
export function invalidateQuery(path: string) {
  globalMutate(apiUrl(path));
}

/**
 * Invalidate all cached queries matching a pattern.
 */
export function invalidateQueries(pathPattern: string) {
  globalMutate(
    (key) => typeof key === "string" && key.includes(pathPattern),
    undefined,
    { revalidate: true }
  );
}

// Convenience types for API responses
export interface Organization {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string | null;
  settings: {
    timezone?: string;
    currency?: string;
    attribution_window?: number;
  };
  onboarding_status: "pending" | "store_connected" | "ads_connected" | "completed";
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  avatar_url: string;
}

export interface Integration {
  id: string;
  platform: string;
  platform_display: string;
  account_id: string;
  account_name: string;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  external_id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  conversions: number;
  last_sync_at: string | null;
}

export interface DailyMetrics {
  id: string;
  date: string;
  revenue: number;
  orders_count: number;
  average_order_value: number;
  new_customers_count: number;
  total_spend: number;
  spend_by_platform: Record<string, number>;
  net_profit: number;
  roas: number;
  mer: number;
  net_margin: number;
  ncpa: number;
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  trend: number;
  trend_label: string;
  icon: string;
  trend_type: "up" | "down" | "neutral";
  color?: string;
  order: number;
}

export interface PerformanceData {
  id: string;
  date: string;
  revenue: number;
  spend: number;
}

export interface PlatformSpend {
  id: string;
  platform: string;
  percentage: number;
  color: string;
}

export interface DashboardData {
  metrics: Metric[];
  performance: PerformanceData[];
  platform_spend: PlatformSpend[];
  daily_metrics: DailyMetrics | null;
  date_range: {
    start_date: string;
    end_date: string;
  };
}

export interface OnboardingStatus {
  status: string;
  completed_at: string | null;
  has_store_connected: boolean;
  has_ads_connected: boolean;
  connected_integrations: string[];
}
