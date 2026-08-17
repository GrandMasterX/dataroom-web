'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useDeleteNode, useStats } from '@/lib/api/hooks';
import { formatBytes } from '@/lib/format';
import type { Node } from '@/lib/api/types';

/**
 * Deletion, with the warning stating what will actually be removed.
 *
 * The totals come from the server rather than from what happens to be loaded in the listing:
 * a folder's contents can be far larger than the page on screen, and "delete 3 items" would
 * be a lie the moment the folder has more than one page.
 */
export function DeleteDialog({
  node,
  onOpenChange,
  redirectTo,
}: {
  node: Node | null;
  onOpenChange: (open: boolean) => void;
  /** Where to go when the item currently being viewed is the one deleted. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const remove = useDeleteNode();
  const stats = useStats(node?.type === 'FOLDER' ? node.id : undefined, node !== null);

  const contents = stats.data;
  const hasContents = Boolean(contents && (contents.fileCount > 0 || contents.folderCount > 0));

  return (
    <Dialog
      open={node !== null}
      onOpenChange={onOpenChange}
      destructive
      title={node?.type === 'FOLDER' ? 'Delete folder' : 'Delete file'}
      description={
        node?.type === 'FOLDER' ? (
          <>
            <strong className="font-medium text-foreground">{node.name}</strong> and everything
            inside it will be permanently deleted.
          </>
        ) : (
          <>
            <strong className="font-medium text-foreground">{node?.name}</strong> will be
            permanently deleted, including previous versions.
          </>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => {
              if (!node) return;
              remove.mutate(
                { nodeId: node.id, parentId: node.parentId },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    if (redirectTo) router.push(redirectTo);
                  },
                },
              );
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      {node?.type === 'FOLDER' && (
        <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm">
          {stats.isPending && <span className="text-muted">Checking what is inside…</span>}
          {contents && !hasContents && <span className="text-muted">This folder is empty.</span>}
          {contents && hasContents && (
            <span>
              Contains{' '}
              <strong className="font-medium">
                {contents.fileCount} {contents.fileCount === 1 ? 'file' : 'files'}
              </strong>{' '}
              in{' '}
              <strong className="font-medium">
                {contents.folderCount} {contents.folderCount === 1 ? 'subfolder' : 'subfolders'}
              </strong>{' '}
              · {formatBytes(contents.totalSizeBytes)}
            </span>
          )}
        </div>
      )}

      {remove.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {(remove.error as Error).message}
        </p>
      )}
    </Dialog>
  );
}
