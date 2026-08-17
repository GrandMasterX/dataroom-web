'use client';

import { Explorer } from '@/components/explorer/explorer';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { Icon } from '@/components/ui/icons';
import { FileViewer } from '@/components/viewer/file-viewer';
import { useSharedLink } from '@/lib/api/hooks';

/**
 * The landing page for a public link.
 *
 * A link can point at a folder or at a single file, so what to render is only known after
 * resolving it. An unknown, revoked and expired link all answer the same way — the interface
 * says so plainly rather than guessing which of the three happened, because the API
 * deliberately does not distinguish them either.
 */
export function SharedEntry({ token }: { token: string }) {
  const link = useSharedLink(token);

  if (link.isPending) return <Skeleton rows={6} />;

  if (link.isError) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon={<Icon.Link className="size-8" />}
          title="This link is no longer available"
          description="It may have been turned off by the owner, or it may have expired. Ask whoever shared it for a new one."
        />
      </div>
    );
  }

  return link.data.nodeType === 'FOLDER' ? (
    <Explorer nodeId={link.data.nodeId} />
  ) : (
    <FileViewer nodeId={link.data.nodeId} />
  );
}
