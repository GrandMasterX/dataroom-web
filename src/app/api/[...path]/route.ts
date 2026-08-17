import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/server/api-proxy';

/**
 * Everything the browser sends to the API goes through here.
 *
 * The browser never calls the API directly, which is what keeps session tokens in
 * first-party httpOnly cookies and out of JavaScript. The API itself stays publicly
 * reachable and CORS-enabled — this is a backend-for-frontend, not a hiding place.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxyToApi(request, path.join('/'));
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;

// Session state must never be served from a cache.
export const dynamic = 'force-dynamic';
