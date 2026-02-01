/**
 * Core API Client
 * ky-based HTTP client with authentication, error handling, and logging
 */

import ky, { HTTPError, TimeoutError } from 'ky';
import type { ApiClient, ApiClientConfig, RequestOptions } from './types';
import { createApiError, ApiNetworkError } from './errors';
import { logRequest, logResponse, logError } from './logger';

const API_VERSION = '/api/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, getToken, enableLogging = false } = config;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, headers: customHeaders, timeout = DEFAULT_TIMEOUT } = options;

    // Build URL with query parameters
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${baseUrl}${API_VERSION}${cleanPath}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Get auth token
    const token = await getToken();

    // Build headers
    const headers: Record<string, string> = {
      ...customHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type for requests with body
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const startTime = Date.now();

    if (enableLogging) {
      logRequest(method, url, headers, body);
    }

    try {
      const response = await ky(url, {
        method,
        headers,
        json: body !== undefined && !(body instanceof FormData) ? body : undefined,
        body: body instanceof FormData ? body : undefined,
        timeout,
        retry: 0, // We handle retries at the query layer
      });

      // Handle 204 No Content
      if (response.status === 204) {
        const duration = Date.now() - startTime;
        if (enableLogging) {
          logResponse(method, url, 204, duration);
        }
        return undefined as T;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        // Return text for non-JSON responses
        data = (await response.text()) as T;
      }

      const duration = Date.now() - startTime;
      if (enableLogging) {
        logResponse(method, url, response.status, duration, data);
      }

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof HTTPError) {
        // Try to parse error response body
        let errorData: unknown;
        try {
          const contentType = error.response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorData = await error.response.json();
          } else {
            errorData = await error.response.text();
          }
        } catch {
          errorData = null;
        }

        if (enableLogging) {
          logResponse(method, url, error.response.status, duration, errorData);
        }

        throw createApiError(
          error.response.status,
          error.response.statusText,
          errorData,
          method,
          url
        );
      }

      if (error instanceof TimeoutError) {
        if (enableLogging) {
          logError(method, url, error);
        }
        throw new ApiNetworkError('Request timed out', method, url);
      }

      // Network errors
      if (enableLogging) {
        logError(method, url, error);
      }

      throw new ApiNetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
        method,
        url
      );
    }
  }

  return {
    get<T>(path: string, options?: RequestOptions): Promise<T> {
      return request<T>('GET', path, undefined, options);
    },

    post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('POST', path, body, options);
    },

    put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('PUT', path, body, options);
    },

    patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('PATCH', path, body, options);
    },

    delete<T>(path: string, options?: RequestOptions): Promise<T> {
      return request<T>('DELETE', path, undefined, options);
    },
  };
}
