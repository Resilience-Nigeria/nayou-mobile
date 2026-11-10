import { APP_NAME } from './brand';
import { API_URL } from './config';
import { clearToken, getToken, saveToken } from './tokenStore';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public errors: Record<string, string[]> = {},
    public meta: Record<string, unknown> = {},
  ) {
    super(message);
  }
  /** First field-level message, else the general one. */
  get friendly(): string {
    const first = Object.values(this.errors)[0]?.[0];
    return first ?? this.message;
  }
}

type Envelope<T> = { success: boolean; message: string; data: T; meta?: Record<string, unknown>; code?: string; errors?: Record<string, string[]> };

let onSignedOut: (() => void) | null = null;
export function setSignedOutHandler(fn: (() => void) | null) {
  onSignedOut = fn;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time; every 401 that arrives meanwhile waits for it. */
async function refreshToken(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
      });
      if (!res.ok) return false;
      const body = (await res.json()) as Envelope<{ token: string }>;
      await saveToken(body.data.token);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta: Record<string, any> }> {
  const { method = 'GET', body, form, query, headers = {}, auth = true, signal } = opts;
  const qs = query
    ? '?' + Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : '';

  const send = () =>
    fetch(`${API_URL}${path}${qs}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...headers,
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && auth && getToken()) {
      if (await refreshToken()) {
        res = await send();
      } else {
        await clearToken();
        onSignedOut?.();
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(`Cannot reach ${APP_NAME}${__DEV__ ? ` at ${API_URL} (${method} ${path}: ${(e as Error).message})` : ''}. Check your connection and try again.`, 'network_error', 0);
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok || !json || json.success === false) {
    const j = json as any;
    if (res.status === 403 && j?.code === 'account_inactive') {
      await clearToken();
      onSignedOut?.();
    }
    throw new ApiError(
      j?.message ?? 'Something went wrong. Please try again.',
      j?.code ?? (res.status === 422 ? 'validation_failed' : 'error'),
      res.status,
      j?.errors && !Array.isArray(j.errors) ? j.errors : {},
      j?.meta && !Array.isArray(j.meta) ? j.meta : {},
    );
  }
  return { data: json.data, meta: (json.meta as Record<string, any>) ?? {} };
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }).then((r) => r.data),
  page: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body: body ?? {} }).then((r) => r.data),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }).then((r) => r.data),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }).then((r) => r.data),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }).then((r) => r.data),
};
