'use client';

import Link from 'next/link';
import { useNodeLinks } from '@/components/explorer/node-links';
import { Icon } from '@/components/ui/icons';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useSearch } from '@/lib/api/hooks';
import { formatBytes } from '@/lib/format';

/**
 * Results for a name search inside the current subtree.
 *
 * Each result names the folder it was found in, which is what makes a hit actionable — three
 * files called "Q1 accounts.pdf" are indistinguishable otherwise. For a guest that folder is
 * always inside what they were shared, so nothing above the boundary appears.
 */
export function SearchResults({ nodeId, query }: { nodeId: string; query: string }) {
  const links = useNodeLinks();
  const search = useSearch(nodeId, query);

  if (search.isPending) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <Skeleton rows={3} />
      </div>
    );
  }

  if (search.isError) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState error={search.error} onRetry={() => void search.refetch()} />
      </div>
    );
  }

  if (search.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface">
        <EmptyState
          icon={<Icon.Search className="size-8" />}
          title={`No matches for “${query}”`}
          description="Search looks at file and folder names inside this folder."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <p className="border-b border-border px-4 py-2 text-xs text-muted">
        {search.data.length} {search.data.length === 1 ? 'match' : 'matches'} for “{query}”
      </p>
      <ul className="divide-y divide-border">
        {search.data.map((hit) => (
          <li key={hit.id}>
            <Link
              href={hit.type === 'FOLDER' ? links.folderHref(hit.id) : links.fileHref(hit.id)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
            >
              <span className={hit.type === 'FOLDER' ? 'text-blue-600' : 'text-slate-400'}>
                {hit.type === 'FOLDER' ? (
                  <Icon.Folder className="size-4.5" />
                ) : (
                  <Icon.FileText className="size-4.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{hit.name}</span>
                {hit.parentName && (
                  <span className="block truncate text-xs text-muted">in {hit.parentName}</span>
                )}
              </span>
              {hit.type === 'FILE' && hit.sizeBytes != null && (
                <span className="text-xs text-muted">{formatBytes(hit.sizeBytes)}</span>
              )}
              <Icon.ChevronRight className="size-4 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
