/**
 * API Logger
 * Development logging with sensitive header redaction
 */

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      redacted[key] = value.slice(0, 10) + '...[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function logRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
): void {
  console.groupCollapsed(`%c[API] ${method} ${url}`, 'color: #6366f1; font-weight: bold');
  console.log('Headers:', redactHeaders(headers));
  if (body !== undefined) {
    console.log('Body:', body);
  }
  console.groupEnd();
}

export function logResponse(
  method: string,
  url: string,
  status: number,
  duration: number,
  data?: unknown
): void {
  const color = status >= 400 ? '#ef4444' : '#10b981';
  console.groupCollapsed(
    `%c[API] ${method} ${url} - ${status} (${duration}ms)`,
    `color: ${color}; font-weight: bold`
  );
  if (data !== undefined) {
    console.log('Response:', data);
  }
  console.groupEnd();
}

export function logError(
  method: string,
  url: string,
  error: unknown
): void {
  console.groupCollapsed(
    `%c[API] ${method} ${url} - Error`,
    'color: #ef4444; font-weight: bold'
  );
  console.error(error);
  console.groupEnd();
}
