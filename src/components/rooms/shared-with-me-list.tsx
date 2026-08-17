'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useSharedWithMe } from '@/lib/api/hooks';
import { formatRelativeDate } from '@/lib/format';

/**
 * Where an invited guest lands.
 *
 * This service sends no email, so a grant only becomes visible to the person who received it
 * when they sign in. Without this list they would have been given access with no way to find
 * it.
 */
export function SharedWithMeList() {
  const shared = useSharedWithMe();

  return (
    <section>
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Shared with you</h2>
        <p className="text-sm text-muted">Items other people have given you access to.</p>
      </header>

      {shared.isPending && <Skeleton rows={2} />}
      {shared.isError && <ErrorState error={shared.error} onRetry={() => void shared.refetch()} />}

      {shared.data?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface">
          <EmptyState
            icon={<Icon.Users className="size-8" />}
            title="Nothing shared with you yet"
            description="When someone grants you access to a folder or a file, it appears here."
          />
        </div>
      )}

      {shared.data && shared.data.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {shared.data.map((item) => (
            <li key={item.nodeId}>
              <Link
                href={
                  item.nodeType === 'FOLDER'
                    ? `/d/${item.dataRoomId}/f/${item.nodeId}`
                    : `/d/${item.dataRoomId}/file/${item.nodeId}`
                }
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-slate-500">
                  {item.nodeType === 'FOLDER' ? (
                    <Icon.Folder className="size-4.5" />
                  ) : (
                    <Icon.FileText className="size-4.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.nodeName}</span>
                  <span className="block text-xs text-muted">
                    Shared by {item.sharedBy} · {formatRelativeDate(item.sharedAt)}
                  </span>
                </span>
                <Icon.ChevronRight className="size-4 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
