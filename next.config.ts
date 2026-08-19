import type { NextConfig } from "next";

/**
 * Response headers for every page this app serves.
 *
 * The API sets its own through helmet, but those protect API responses; the HTML a person
 * actually browses is served from here and was getting nothing but HSTS from the platform.
 *
 * `Referrer-Policy` is the one that matters most for this product rather than in general: a
 * document is opened from a presigned storage URL that carries its own signature, and a
 * referrer header is the classic way such a URL ends up in somebody else's logs.
 *
 * Deliberately absent: a Content-Security-Policy. An honest one here would have to allow
 * `'unsafe-inline'` for scripts, because this app does not run a nonce pipeline, and to
 * open `frame-src` and `connect-src` to the storage origin so the viewer and the direct
 * upload keep working. That policy would block almost nothing while reading as protection —
 * see the README for what the viewer's safety actually rests on.
 */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  // Next writes its own AGENTS.md and CLAUDE.md; this repository carries its own agent
  // instructions under .claude/, and a generic generated one would sit on top of them.
  agentRules: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
