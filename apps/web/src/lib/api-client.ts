/**
 * Drikon API client.
 *
 * - Sends cookies on every request (`credentials: 'include'`) so auth flows automatically.
 * - On 401, transparently calls /auth/refresh and replays the original request once.
 * - Never reads tokens — they live in httpOnly cookies the browser can't touch.
 * - Returns typed data or throws an ApiError.
 */
import type { ApiResult } from '@drikon/shared-types';

const API_BASE =
  (typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
    : window.location.protocol + '//' + (process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') ?? 'localhost:4000')) ??
  'http://localhost:4000';

/**
 * Per-browser CSRF token, echoed in the `X-CSRF-Token` header. The API requires
 * this header on state-changing requests; browsers forbid setting custom headers
 * on forged cross-site requests, so this defeats CSRF. Empty on the server (RSC
 * only issues safe GETs, which the API doesn't gate).
 */
function csrfToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    let t = localStorage.getItem('drikon_csrf');
    if (!t) {
      t = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
      localStorage.setItem('drikon_csrf', t);
    }
    return t;
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the auto-refresh-on-401 behaviour (used by /auth/refresh itself). */
  skipRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  // Coalesce concurrent refreshes — first call wins, others wait.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Reset the gate after a microtask so newcomers actually re-fetch.
        setTimeout(() => (refreshPromise = null), 0);
      }
    })();
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  const doRequest = (): Promise<Response> =>
    fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        'X-CSRF-Token': csrfToken(),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doRequest();

  // Auto-refresh once on 401 (unless we're already on the refresh endpoint).
  if (response.status === 401 && !skipRefresh && !path.includes('/auth/refresh')) {
    const refreshed = await refreshTokens();
    if (refreshed) response = await doRequest();
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = (isJson ? await response.json() : await response.text()) as ApiResult<T> | string;

  if (!response.ok) {
    const err =
      typeof payload === 'string'
        ? { error: { code: 'HTTP_ERROR', message: payload } }
        : (payload as Extract<ApiResult<T>, { success: false }>);
    throw new ApiError(
      response.status,
      err.error?.code ?? 'HTTP_ERROR',
      typeof err.error?.message === 'string' ? err.error.message : JSON.stringify(err.error?.message),
      (err as any).requestId,
    );
  }

  // Unwrap our `{ success, data }` envelope. Tolerate raw payloads too.
  if (typeof payload === 'object' && payload && 'data' in payload) {
    return (payload as Extract<ApiResult<T>, { success: true }>).data;
  }
  return payload as T;
}

// ─── Convenience methods ───
export const apiGet  = <T,>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'GET' });
export const apiPost = <T,>(path: string, body?: unknown, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'POST', body });
export const apiPatch = <T,>(path: string, body?: unknown, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'PATCH', body });
export const apiDelete = <T,>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'DELETE' });
