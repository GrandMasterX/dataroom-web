'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { useStats } from '@/lib/api/hooks';
import { formatBytes, formatRelativeDate } from '@/lib/format';
import type { DataRoom } from '@/lib/api/types';

export function DataRoomCard({ room }: { room: DataRoom }) {
  // Totals are a subtree scan, so they are fetched per card here and never per row inside a
  // folder listing — fifty rows would mean fifty scans for one screen.
  const stats = useStats(room.rootNodeId);

  return (
    <Link
      href={`/d/${room.id}/f/${room.rootNodeId}`}
      className="group flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
          <Icon.FolderOpen className="size-4.5" />
        </span>
        <Icon.ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-3 truncate text-sm font-semibold text-foreground" title={room.name}>
        {room.name}
      </h3>

      <p className="mt-1 text-xs text-muted">
        {stats.isPending ? (
          <span className="inline-block h-3 w-24 animate-pulse rounded bg-slate-200 align-middle" />
        ) : stats.data ? (
          <>
            {stats.data.fileCount} {stats.data.fileCount === 1 ? 'file' : 'files'} ·{' '}
            {formatBytes(stats.data.totalSizeBytes)}
          </>
        ) : (
          'Totals unavailable'
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted">Updated {formatRelativeDate(room.updatedAt)}</p>
    </Link>
  );
}
