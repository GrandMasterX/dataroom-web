'use client';

import { useState } from 'react';
import { DeleteDialog } from '@/components/dialogs/delete-dialog';
import { MoveDialog } from '@/components/dialogs/move-dialog';
import { RenameDialog } from '@/components/dialogs/rename-dialog';
import { ShareDialog } from '@/components/dialogs/share-dialog';
import { Breadcrumbs } from '@/components/explorer/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useNodeLinks } from '@/components/explorer/node-links';
import { useNode, usePreviewUrl } from '@/lib/api/hooks';
import type { Node } from '@/lib/api/types';
import { DownloadCard, PdfFrame } from './pdf-frame';
import { FileMetaPanel } from './file-meta-panel';

/**
 * One document.
 *
 * The signed URL is fetched separately from the file's metadata and refreshed shortly before
 * it expires, so a document left open for an hour keeps working without the reader noticing
 * anything — and without the frame reloading and losing their place.
 */
export function FileViewer({ nodeId }: { nodeId: string }) {
  const links = useNodeLinks();
  const detail = useNode(nodeId);
  const preview = usePreviewUrl(nodeId);

  const [renaming, setRenaming] = useState<Node | null>(null);
  const [moving, setMoving] = useState<Node | null>(null);
  const [deleting, setDeleting] = useState<Node | null>(null);
  const [sharing, setSharing] = useState<Node | null>(null);

  if (detail.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-72 animate-pulse rounded bg-slate-200" />
        <Skeleton rows={4} />
      </div>
    );
  }

  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { node, breadcrumbs, capabilities } = detail.data;
  const parentId = breadcrumbs.at(-1)?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs trail={breadcrumbs} current={node.name} />

        <div className="flex items-center gap-2">
          {preview.data && (
            <a
              href={preview.data.url}
              download={node.name}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-medium hover:bg-slate-50"
            >
              <Icon.Download className="size-4" />
              Download
            </a>
          )}
          {capabilities.canShare && (
            <Button onClick={() => setSharing(node)}>
              <Icon.Share className="size-4" />
              Share
            </Button>
          )}
          {capabilities.canRename && (
            <Button onClick={() => setRenaming(node)}>
              <Icon.Pencil className="size-4" />
              Rename
            </Button>
          )}
          {capabilities.canMove && (
            <Button onClick={() => setMoving(node)}>
              <Icon.FolderOpen className="size-4" />
              Move
            </Button>
          )}
          {capabilities.canDelete && (
            <Button variant="ghost" onClick={() => setDeleting(node)}>
              <Icon.Trash className="size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div>
          {preview.isPending && (
            <div className="grid h-[28rem] place-items-center rounded-lg border border-border bg-surface">
              <span className="text-sm text-muted">Preparing the document…</span>
            </div>
          )}
          {preview.isError && (
            <div className="rounded-lg border border-border bg-surface">
              <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
            </div>
          )}
          {preview.data &&
            (preview.data.disposition === 'inline' ? (
              <PdfFrame url={preview.data.url} fileName={node.name} />
            ) : (
              <DownloadCard url={preview.data.url} fileName={node.name} />
            ))}
        </div>

        {preview.data && (
          <FileMetaPanel nodeId={node.id} preview={preview.data} capabilities={capabilities} />
        )}
      </div>

      <RenameDialog node={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
      <MoveDialog
        key={moving?.id ?? 'move'}
        node={moving}
        rootNodeId={breadcrumbs[0]?.id ?? node.id}
        onOpenChange={(open) => !open && setMoving(null)}
      />
      <DeleteDialog
        node={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        // Deleting the document being viewed leaves nowhere to stand, so the viewer returns
        // to the folder that contained it.
        redirectTo={parentId ? links.folderHref(parentId) : '/'}
      />
      <ShareDialog node={sharing} onOpenChange={(open) => !open && setSharing(null)} />
    </div>
  );
}
