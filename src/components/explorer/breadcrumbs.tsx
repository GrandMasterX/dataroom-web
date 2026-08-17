'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import type { Breadcrumb } from '@/lib/api/types';

/**
 * The trail above the listing.
 *
 * For a guest the trail arrives already truncated to what they were given access to, so this
 * component renders whatever it receives without deciding what may be shown — that decision
 * belongs to the API, where it cannot be bypassed.
 */
export function Breadcrumbs({
  roomId,
  trail,
  current,
}: {
  roomId: string;
  trail: Breadcrumb[];
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {trail.map((crumb) => (
        <span key={crumb.id} className="flex min-w-0 items-center gap-1">
          <Link
            href={`/d/${roomId}/f/${crumb.id}`}
            className="max-w-[12rem] truncate rounded px-1 text-muted hover:text-foreground hover:underline"
          >
            {crumb.name}
          </Link>
          <Icon.ChevronRight className="size-3.5 shrink-0 text-slate-300" />
        </span>
      ))}
      <span className="truncate px-1 font-medium text-foreground" aria-current="page">
        {current}
      </span>
    </nav>
  );
}
