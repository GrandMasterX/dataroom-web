'use client';

import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { Button } from './button';

/**
 * The four states every data surface has to render, as components rather than as inline
 * conditionals.
 *
 * A chain like `{data && <List/>}` silently renders nothing for the other three, which reads
 * as a broken page. Naming them makes forgetting one visible in review.
 */

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-px" aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <div className="size-5 animate-pulse rounded bg-slate-200" />
          {/* Occupies the real row height so content does not jump when it arrives. */}
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" style={{ maxWidth: `${40 + ((index * 17) % 40)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="dr-enter flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Distinguishes what a retry can fix from what it cannot.
 *
 * A deleted or revoked item answers the same way however many times it is asked, so offering
 * "try again" there is worse than explaining what happened.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : undefined;

  if (apiError?.isGone) {
    return (
      <EmptyState
        title="This item is no longer available"
        description="It may have been deleted, or the access you were given has been revoked."
      />
    );
  }

  return (
    <EmptyState
      title="Something went wrong"
      description={apiError?.message ?? 'The request could not be completed.'}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
