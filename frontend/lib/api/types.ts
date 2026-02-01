/**
 * API Client Types
 */

export interface ApiClientConfig {
  /** Base URL for API requests (e.g., https://api.lucaserv.com) */
  baseUrl: string;
  /** Function to retrieve the authentication token */
  getToken: () => Promise<string | null>;
  /** Enable request/response logging (defaults to true in development) */
  enableLogging?: boolean;
}

export interface RequestOptions {
  /** Query parameters to append to the URL */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface ApiClient {
  /** Perform a GET request */
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Perform a POST request */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /** Perform a PUT request */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /** Perform a PATCH request */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  /** Perform a DELETE request */
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

/** Paginated response from Django REST Framework */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
