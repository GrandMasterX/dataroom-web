'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import type { Capabilities, Node } from '@/lib/api/types';
import { NodeRow, type NodeRowActions } from './node-row';

/**
 * The listing.
 *
 * Loading, empty, error and success are separate branches rather than a chain of `&&`: with a
 * chain, three of the four states render nothing, which a user reads as a broken page.
 */
export function NodeTable({
  capabilities,
  actions,
  query,
  emptyAction,
}: {
  capabilities: Capabilities;
  actions: NodeRowActions;
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    pages: { items: Node[] }[] | undefined;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };
  emptyAction?: React.ReactNode;
}) {
  if (query.isPending) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <Skeleton rows={6} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState error={query.error} onRetry={query.refetch} />
      </div>
    );
  }

  // Pages are merged and de-duplicated by id: a rename can reorder items between requests,
  // and the same node appearing twice would break React keys as well as the reader's trust.
  const seen = new Set<string>();
  const items = (query.pages ?? [])
    .flatMap((page) => page.items)
    .filter((node) => (seen.has(node.id) ? false : seen.add(node.id)));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface">
        <EmptyState
          icon={<Icon.FolderOpen className="size-8" />}
          title="This folder is empty"
          description={
            capabilities.canUpload
              ? 'Drag documents here, or use the upload button above.'
              : 'Nothing has been added to this folder yet.'
          }
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
        <span className="size-4.5" aria-hidden />
        <span className="flex-1">Name</span>
        <span className="hidden w-24 text-right sm:block">Size</span>
        <span className="hidden w-32 text-right md:block">Updated</span>
        <span className="size-7" aria-hidden />
      </div>

      <ul className="divide-y divide-border">
        {items.map((node) => (
          <NodeRow key={node.id} node={node} capabilities={capabilities} actions={actions} />
        ))}
      </ul>

      {query.hasNextPage && (
        <div className="border-t border-border p-3 text-center">
          <Button
            variant="secondary"
            loading={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
