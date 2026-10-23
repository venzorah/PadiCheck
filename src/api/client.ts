const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '').replace(/\/v1$/, '');
let accessToken: string | null = null;
const expiredListeners = new Set<() => void>();
export function setAccessToken(token: string | null) { accessToken = token; }
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId?: string, public retryAfter?: string | null) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function api<T>(path: string, options: {
  method?: string; json?: unknown; file?: File; signal?: AbortSignal; auth?: boolean; token?: string;
} = {}): Promise<T> {
  const token = options.auth ? (options.token ?? accessToken) : undefined;
  if (options.auth && !token) throw new ApiError(401, 'authentication_required', 'Please sign in to continue.');
  const headers = new Headers({ Accept: 'application/json' });
  const requestUrl = `${baseUrl}${path}`;
  const hostname = new URL(requestUrl, globalThis.location?.origin ?? 'http://localhost').hostname;
  // Free ngrok tunnels otherwise replace API GET responses with browser-warning text.
  if (/(?:^|\.)ngrok(?:-free)?\.(?:app|dev|io)$/.test(hostname)) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (options.file) {
    const form = new FormData();
    form.append('file', options.file);
    body = form;
  } else if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }
  const response = await fetch(requestUrl, { method: options.method ?? 'GET', headers, body, signal: options.signal, cache: 'no-store', credentials: 'omit' });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && token && token === accessToken) {
      accessToken = null;
      expiredListeners.forEach((listener) => listener());
    }
    throw new ApiError(response.status, data?.error?.code ?? 'request_failed', data?.error?.message ?? 'Request failed. Please try again.', data?.request_id, response.headers.get('Retry-After'));
  }
  if (data === undefined) throw new ApiError(response.status, 'invalid_response', 'The API returned an unreadable response. Check the API connection.');
  return data as T;
}
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof SyntaxError) return 'Enter valid JSON configuration before submitting.';
    if (error instanceof TypeError) return 'Could not connect. Check your connection and try again.';
    return error instanceof Error ? error.message : 'The request could not complete. Please try again.';
  }
  let message = error.status === 503 ? 'This service is currently unavailable. Please try again later.' : error.message;
  if (error.status === 429) message = `Too many requests. ${error.retryAfter ? `Retry after: ${error.retryAfter}.` : 'Please wait before trying again.'}`;
  return message;
}
