import type { NextResponse } from 'next/server';

/**
 * Session tokens live in first-party httpOnly cookies set by this app, never in the
 * browser's JavaScript.
 *
 * The API is a separate origin, so putting its tokens in cookies directly would mean
 * cross-site cookies — `SameSite=None`, third-party cookie policies, and a class of bugs
 * that appear only in some browsers. Proxying through this app makes the cookies
 * first-party, and because they are httpOnly, an XSS bug cannot read the session either.
 */
export const ACCESS_COOKIE = 'dr_access';
export const REFRESH_COOKIE = 'dr_refresh';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
}

export function applySession(response: NextResponse, tokens: SessionTokens): void {
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    // Slightly longer than the token itself: an expired cookie and an expired token look
    // different to the proxy, and the refresh path needs the request to still arrive.
    maxAge: tokens.accessTokenExpiresInSeconds + 60,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
