import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/server/api-proxy';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  applySession,
  clearSession,
  type SessionTokens,
} from '@/lib/server/session-cookies';

/**
 * Sign-in, sign-up and sign-out, handled here rather than by the generic proxy because they
 * are the only routes that change the session itself.
 *
 * The tokens the API returns in its response body are moved into httpOnly cookies and
 * removed from what reaches the browser, so a script on the page cannot read them even if
 * one is injected.
 */
type RouteContext = { params: Promise<{ action: string }> };

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { action } = await context.params;

  if (action === 'logout') {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      // Best effort: the user's intent is to be signed out here, so a failure upstream must
      // not leave the cookies in place.
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      }).catch(() => undefined);
    }
    const response = new NextResponse(null, { status: 204 });
    clearSession(response);
    return response;
  }

  if (action !== 'login' && action !== 'register') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Unknown auth action' } },
      { status: 404 },
    );
  }

  const upstream = await fetch(`${API_URL}/auth/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });

  const payload: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(payload ?? { error: { code: 'INTERNAL' } }, {
      status: upstream.status,
    });
  }

  const session = payload as SessionTokens & { user: unknown };
  const response = NextResponse.json({ user: session.user }, { status: upstream.status });
  applySession(response, session);
  return response;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { action } = await context.params;
  if (action !== 'session') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Unknown auth action' } },
      { status: 404 },
    );
  }

  // Answers "is anyone signed in" without the caller needing to know about tokens at all.
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ user: null });

  const upstream = await fetch(`${API_URL}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!upstream.ok) return NextResponse.json({ user: null });

  return NextResponse.json({ user: await upstream.json() });
}

export const dynamic = 'force-dynamic';
