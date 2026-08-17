'use client';

import { useEffect } from 'react';
import { setShareToken } from '@/lib/api/client';

/**
 * Makes every request inside a public-link page carry that link's token.
 *
 * The token is registered during render rather than in an effect: children render after this
 * component and start their queries immediately, so an effect would run too late and the
 * first request would go out unauthenticated — resolving as "not found", which is exactly
 * what an unauthorised request looks like.
 *
 * It is cleared on unmount so that navigating away from a shared page does not leave a token
 * attached to the visitor's own requests.
 */
export function ShareTokenBoundary({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  setShareToken(token);

  useEffect(() => {
    setShareToken(token);
    return () => setShareToken(undefined);
  }, [token]);

  return <>{children}</>;
}
