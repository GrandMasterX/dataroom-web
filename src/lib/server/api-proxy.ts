import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  applySession,
  clearSession,
  type SessionTokens,
} from './session-cookies';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Headers forwarded to the API. An allowlist rather than a pass-through: forwarding
 * everything would send the browser's own cookies and any header a page happens to set,
 * and the API should only ever see what this proxy decides to tell it.
 */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'x-share-token'];

/**
 * In-flight refresh operations, keyed by the refresh token being exchanged.
 *
 * Without this, a tab that wakes up and refetches four queries at once sends four parallel
 * refreshes with the same token. The first rotates it; the rest look exactly like a replayed
 * token, and strict reuse detection would end every session for that user — signing someone
 * out for switching back to a tab. The API also allows a short grace window; this is the
 * half that belongs on the client side.
 */
const refreshesInFlight = new Map<string, Promise<SessionTokens | null>>();

export async function proxyToApi(request: NextRequest, path: string): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const body = await readBody(request);

  // Refresh before asking rather than after being refused, when the short-lived access
  // cookie has already expired and only the refresh cookie remains.
  //
  // Waiting for a 401 does not work here, and the reason is a collision between two
  // decisions that are each correct on their own: read endpoints answer 404 rather than 403
  // so that they never confirm a resource exists, and an expired session makes a request
  // anonymous rather than invalid. An anonymous read therefore comes back as 404 — a status
  // this proxy has no business retrying — and the user is told the document no longer
  // exists when in fact their session simply lapsed.
  let refreshed: SessionTokens | null = null;
  if (!accessToken && refreshToken) {
    refreshed = await refreshSession(refreshToken);
    accessToken = refreshed?.accessToken;
  }

  const first = await callApi(request, path, body, accessToken);

  if (first.status !== 401 || !refreshToken) {
    const response = await toNextResponse(first);
    if (refreshed) applySession(response, refreshed);
    return response;
  }

  // The access token expired mid-session. Refresh once, retry once; a second 401 means the
  // session is genuinely over rather than merely stale.
  const tokens = await refreshSession(refreshToken);
  if (!tokens) {
    const response = await toNextResponse(first);
    clearSession(response);
    return response;
  }

  const retried = await callApi(request, path, body, tokens.accessToken);
  const response = await toNextResponse(retried);
  applySession(response, tokens);
  return response;
}

async function refreshSession(refreshToken: string): Promise<SessionTokens | null> {
  const existing = refreshesInFlight.get(refreshToken);
  if (existing) return existing;

  const attempt = (async (): Promise<SessionTokens | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
      if (!response.ok) return null;
      return (await response.json()) as SessionTokens;
    } catch {
      return null;
    } finally {
      // Removed in the same turn the promise settles, so a later expiry starts a fresh one.
      refreshesInFlight.delete(refreshToken);
    }
  })();

  refreshesInFlight.set(refreshToken, attempt);
  return attempt;
}

async function callApi(
  request: NextRequest,
  path: string,
  body: string | undefined,
  accessToken: string | undefined,
): Promise<Response> {
  const url = new URL(`${API_URL}/${path}`);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  // Lets the API rate-limit by the real client rather than by this proxy's address.
  const clientIp = request.headers.get('x-forwarded-for');
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  return fetch(url, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });
}

async function readBody(request: NextRequest): Promise<string | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const text = await request.text();
  return text.length > 0 ? text : undefined;
}

async function toNextResponse(apiResponse: Response): Promise<NextResponse> {
  const text = await apiResponse.text();
  return new NextResponse(text.length > 0 ? text : null, {
    status: apiResponse.status,
    headers: {
      'content-type': apiResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}

export { API_URL };
