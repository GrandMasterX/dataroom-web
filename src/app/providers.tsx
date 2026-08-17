'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';

/**
 * One QueryClient per browser session, created inside a component so that a server render
 * never shares cache between users.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retrying a 404 or a 403 forever is worse than showing the answer: those do not
            // change on their own, and a spinner that never resolves reads as a broken app.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.isTerminal) return false;
              return failureCount < 2;
            },
            staleTime: 10_000,
            // Deliberately on: it is what turns "the owner revoked your access" or "that
            // folder was deleted" into a clear screen instead of a stale one, without the
            // user having to reload.
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
