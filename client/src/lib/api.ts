/**
 * Centralised typed API client.
 *
 * Single place that owns:
 *  - the API base URL (VITE_API_BASE_URL — no hardcoded hosts/tunnels)
 *  - credentialed requests (refresh token lives in an httpOnly cookie)
 *  - Authorization: Bearer attachment
 *  - request timeout / abort handling
 *  - error classification (network / timeout / 4xx / 5xx)
 *  - silent 401 -> refresh -> retry-once -> force logout
 *
 * Calling services must not build fetch calls themselves.
 */

import { API_BASE_URL, RAZORPAY_KEY_ID, STORAGE_KEYS } from '../services/apiConfig';
import { secureStorage } from './security';

export { API_BASE_URL, RAZORPAY_KEY_ID };

/** Fired when the session is unrecoverable so AuthContext can react. */
export const SESSION_EXPIRED_EVENT = 'idiot-pedals:session-expired';

/** Builds an absolute or same-origin URL for a given API path. */
export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
}

/* -------------------------------------------------------------------------- */
/* Access token storage                                                        */
/* -------------------------------------------------------------------------- */

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    else localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    /* storage unavailable — requests will simply be unauthenticated */
  }
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'unavailable'
  | 'cancelled'
  | 'invalid_response'
  | 'unknown';

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Normalised error every page can branch on. `kind` drives the UI state,
 * `message` is safe to show (server-authored where available).
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly fieldErrors: ApiFieldError[];

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isAuthError(): boolean {
    return this.kind === 'unauthorized' || this.kind === 'forbidden';
  }

  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'server' ||
      this.kind === 'unavailable' ||
      this.kind === 'rate_limited' ||
      this.kind === 'invalid_response'
    );
  }
}

/** Human-friendly fallback copy per error kind (never leaks raw error objects). */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    // Prefer the backend's specific field message over a generic envelope
    // message ("Invalid request", "Validation failed.").
    const genericEnvelope = /^(invalid request|validation failed\.?|bad request)$/i.test(error.message.trim());
    if (error.fieldErrors.length > 0 && (genericEnvelope || !error.message)) {
      const first = error.fieldErrors.find((entry) => entry.message);
      if (first) {
        return first.field ? `${first.field}: ${first.message}` : first.message;
      }
    }

    if (error.message) return error.message;
    switch (error.kind) {
      case 'network':
        return 'Could not reach the workbench server. Check your connection and try again.';
      case 'timeout':
        return 'The server took too long to respond. Please try again.';
      case 'unauthorized':
        return 'Your session has expired. Please sign in again.';
      case 'forbidden':
        return 'You are not authorized to do that.';
      case 'not_found':
        return 'We could not find what you were looking for.';
      case 'conflict':
        return 'That action could not be completed because of a conflict.';
      case 'validation':
        return 'Please check the details you entered and try again.';
      case 'rate_limited':
        return 'Too many requests. Please wait a moment and try again.';
      case 'server':
      case 'unavailable':
        return 'Something went wrong on our side. Please try again.';
      default:
        return 'Something unexpected happened. Please try again.';
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Something unexpected happened. Please try again.';
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 15_000;

/** Endpoints where a 401 means bad credentials, not an expired session. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/verify-email'];

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Attach the Bearer access token (default true) and allow auto-refresh on 401. */
  auth?: boolean;
  timeoutMs?: number;
  /** Skip the automatic refresh-and-retry cycle (default false). */
  retryOn401?: boolean;
  signal?: AbortSignal;
}

interface ServerEnvelope {
  success?: boolean;
  message?: string;
  errors?: unknown;
}

const parseFieldErrors = (errors: unknown): ApiFieldError[] => {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const field = typeof record.field === 'string' ? record.field : typeof record.path === 'string' ? record.path : '';
      const message = typeof record.message === 'string' ? record.message : typeof record.msg === 'string' ? record.msg : '';
      if (!field && !message) return null;
      return { field, message };
    })
    .filter((entry): entry is ApiFieldError => entry !== null);
};

const readBody = async (response: Response): Promise<{ json: ServerEnvelope | null; text: string }> => {
  let text = '';
  try {
    text = await response.text();
  } catch {
    return { json: null, text: '' };
  }
  if (!text) return { json: null, text: '' };
  try {
    const parsed = JSON.parse(text);
    return { json: parsed && typeof parsed === 'object' ? (parsed as ServerEnvelope) : null, text };
  } catch {
    return { json: null, text };
  }
};

const kindForStatus = (status: number): ApiErrorKind => {
  if (status === 400) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  if (status >= 500) return 'server';
  return 'unknown';
};

const fallbackMessageFor = (kind: ApiErrorKind, status: number): string => {
  switch (kind) {
    case 'validation':
      return 'Some of the details you entered are not valid.';
    case 'invalid_response':
      return 'The API returned an unexpected non-JSON response.';
    case 'unauthorized':
      return 'Authentication required.';
    case 'forbidden':
      return 'You are not authorized to perform this action.';
    case 'not_found':
      return 'The requested resource was not found.';
    case 'conflict':
      return 'That action conflicts with the current state.';
    case 'rate_limited':
      return 'Too many requests. Please try again shortly.';
    case 'unavailable':
      return 'This service is temporarily unavailable. Please try again shortly.';
    case 'server':
      return 'Something went wrong on our side. Please try again.';
    default:
      return `Request failed (${status}).`;
  }
};

const isNoRefreshPath = (path: string): boolean => NO_REFRESH_PATHS.some((entry) => path.startsWith(entry));

/* -------------------------------------------------------------------------- */
/* Silent refresh (single-flight)                                              */
/* -------------------------------------------------------------------------- */

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const { json } = await readBody(response);
    const token = (json as { accessToken?: unknown; data?: { accessToken?: unknown } } | null);
    const value = typeof token?.accessToken === 'string' ? token.accessToken : token?.data?.accessToken;

    if (typeof value !== 'string' || !value) return false;

    setAccessToken(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts one silent token refresh. Concurrent callers share a single request
 * so a burst of 401s never triggers a refresh storm.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Clears all client session state and notifies the app. */
export function forceSessionExpired(): void {
  secureStorage.clearAuthData();
  try {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  } catch {
    /* non-browser environment */
  }
}

/* -------------------------------------------------------------------------- */
/* Core request                                                                */
/* -------------------------------------------------------------------------- */

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS, retryOn401 = false, signal } = options;

  // Whether a session token existed before this call. Distinguishes an expired
  // session (force logout) from an anonymous visitor (just unauthenticated).
  const hadToken = Boolean(getAccessToken());

  const send = async (): Promise<Response> => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    // Bridge an externally supplied signal (e.g. component unmount) into the timeout controller.
    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onExternalAbort);
    }

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      if (auth) {
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      return await fetch(apiUrl(path), {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError('timeout', 'The server took too long to respond. Please try again.');
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('cancelled', 'Request cancelled.');
      }
      throw new ApiError('network', 'Could not reach the workbench server. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  };

  let response = await send();

  // 401 on a protected endpoint -> refresh once, then retry the original call.
  if (response.status === 401 && auth && retryOn401 && !isNoRefreshPath(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await send();
    } else {
      if (hadToken) forceSessionExpired();
      throw new ApiError('unauthorized', 'Your session has expired. Please sign in again.', 401);
    }
  }

  const { json, text } = await readBody(response);

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const fieldErrors = parseFieldErrors(json?.errors);
    const serverMessage = typeof json?.message === 'string' ? json.message.trim() : '';
    const message = serverMessage || fallbackMessageFor(kind, response.status);

    // A 401 on a previously-authenticated protected call means the session
    // is gone. Anonymous 401s (login, etc.) must not trigger a logout.
    if (response.status === 401 && auth && retryOn401 && hadToken) {
      forceSessionExpired();
    }

    throw new ApiError(kind, message, response.status, fieldErrors);
  }

  if (json) return json as T;

  /*
   * 2xx with a non-JSON body.
   *
   * This is the signature of a misrouted request: the dev server (no proxy
   * configured) or a static host answers `/api/...` with index.html. Silently
   * returning `{ message: html }` made the UI show a vague load error, so it is
   * reported as a distinct, actionable kind instead.
   */
  throw new ApiError(
    'invalid_response',
    'The API returned a non-JSON response (usually HTML). Check that VITE_API_BASE_URL points at ' +
      'the API, or set VITE_API_PROXY_TARGET for the dev server.',
    response.status
  );
}

/* -------------------------------------------------------------------------- */
/* Public helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Authenticated + auto-refresh on expiry. Use for every protected endpoint. */
export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'GET', retryOn401: options.retryOn401 ?? true }),

  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body, retryOn401: options.retryOn401 ?? true }),

  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PUT', body, retryOn401: options.retryOn401 ?? true }),

  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body, retryOn401: options.retryOn401 ?? true }),

  delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'DELETE', retryOn401: options.retryOn401 ?? true }),
};

/** Public endpoints (no Bearer, no refresh cycle). */
export const publicApi = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body' | 'auth'> = {}) =>
    request<T>(path, { ...options, method: 'GET', auth: false, retryOn401: false }),

  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body' | 'auth'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body, auth: false, retryOn401: false }),
};
