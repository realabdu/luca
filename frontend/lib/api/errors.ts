/**
 * API Error Classes
 * Provides a structured error hierarchy for handling different HTTP error types
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown,
    public method: string,
    public url: string
  ) {
    super(`${method} ${url} failed: ${status} ${statusText}`);
    this.name = 'ApiError';
  }

  get code(): string {
    if (this.data && typeof this.data === 'object' && 'code' in this.data) {
      return String((this.data as { code: unknown }).code);
    }
    return this.name;
  }

  get errorMessage(): string {
    if (this.data && typeof this.data === 'object') {
      const d = this.data as Record<string, unknown>;
      if (typeof d.message === 'string') return d.message;
      if (typeof d.error === 'string') return d.error;
      if (typeof d.detail === 'string') return d.detail;
    }
    return this.message;
  }
}

/** 401 Unauthorized - User is not authenticated */
export class ApiAuthError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data: unknown,
    method: string,
    url: string
  ) {
    super(status, statusText, data, method, url);
    this.name = 'ApiAuthError';
  }
}

/** 403 Forbidden - User lacks permission */
export class ApiForbiddenError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data: unknown,
    method: string,
    url: string
  ) {
    super(status, statusText, data, method, url);
    this.name = 'ApiForbiddenError';
  }
}

/** 404 Not Found - Resource doesn't exist */
export class ApiNotFoundError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data: unknown,
    method: string,
    url: string
  ) {
    super(status, statusText, data, method, url);
    this.name = 'ApiNotFoundError';
  }
}

/** 400/422 Validation Error - Invalid request data */
export class ApiValidationError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data: unknown,
    method: string,
    url: string
  ) {
    super(status, statusText, data, method, url);
    this.name = 'ApiValidationError';
  }

  get fieldErrors(): Record<string, string[]> {
    if (this.data && typeof this.data === 'object' && 'errors' in this.data) {
      return (this.data as { errors: Record<string, string[]> }).errors;
    }
    return {};
  }
}

/** 5xx Server Error - Server-side issues */
export class ApiServerError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data: unknown,
    method: string,
    url: string
  ) {
    super(status, statusText, data, method, url);
    this.name = 'ApiServerError';
  }
}

/** Network Error - Connection failures, timeouts, etc. */
export class ApiNetworkError extends ApiError {
  constructor(message: string, method: string, url: string) {
    super(0, 'Network Error', { message }, method, url);
    this.name = 'ApiNetworkError';
    this.message = `${method} ${url} failed: ${message}`;
  }
}

/**
 * Creates the appropriate error class based on HTTP status code
 */
export function createApiError(
  status: number,
  statusText: string,
  data: unknown,
  method: string,
  url: string
): ApiError {
  switch (status) {
    case 401:
      return new ApiAuthError(status, statusText, data, method, url);
    case 403:
      return new ApiForbiddenError(status, statusText, data, method, url);
    case 404:
      return new ApiNotFoundError(status, statusText, data, method, url);
    case 400:
    case 422:
      return new ApiValidationError(status, statusText, data, method, url);
    default:
      if (status >= 500) {
        return new ApiServerError(status, statusText, data, method, url);
      }
      return new ApiError(status, statusText, data, method, url);
  }
}

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
