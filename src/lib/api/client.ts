/**
 * The browser's only way to reach the API: through this app's own `/api` proxy.
 *
 * Nothing here knows about tokens. Authentication is cookies the browser attaches
 * automatically and the proxy translates, which is what keeps the session out of
 * JavaScript's reach.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The item is gone or was never visible — the two are deliberately indistinguishable. */
  get isGone(): boolean {
    return this.status === 404 || this.status === 410;
  }

  /** Retrying will not help: the answer will not change without something else changing. */
  get isTerminal(): boolean {
    return this.status < 500 && this.status !== 429;
  }
}

/**
 * The share token from a `/s/{token}` page.
 *
 * Held in a module value rather than threaded through every call because the explorer is
 * one component tree serving both an owner and a guest: passing a token through every query
 * would mean every component knowing which of the two it is rendering for.
 */
let activeShareToken: string | undefined;

export function setShareToken(token: string | undefined): void {
  activeShareToken = token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  if (activeShareToken) headers.set('x-share-token', activeShareToken);

  const response = await fetch(`/api/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })
      ?.error;
    throw new ApiError(
      error?.code ?? 'INTERNAL',
      error?.message ?? 'Something went wrong',
      response.status,
      error?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string): Promise<T> => apiFetch<T>(path, { method: 'DELETE' }),
};
