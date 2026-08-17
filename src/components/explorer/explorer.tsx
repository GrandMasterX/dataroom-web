'use client';

import { useRef, useState } from 'react';
import { CreateFolderDialog } from '@/components/dialogs/create-folder-dialog';
import { DeleteDialog } from '@/components/dialogs/delete-dialog';
import { MoveDialog } from '@/components/dialogs/move-dialog';
import { RenameDialog } from '@/components/dialogs/rename-dialog';
import { ShareDialog } from '@/components/dialogs/share-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { SearchInput, MIN_SEARCH_LENGTH } from '@/components/search/search-input';
import { SearchResults } from '@/components/search/search-results';
import { UploadDropzone } from '@/components/upload/upload-dropzone';
import { useChildren, useNode } from '@/lib/api/hooks';
import { useUploadQueue } from '@/lib/uploads/upload-queue';
import type { Node } from '@/lib/api/types';
import { Breadcrumbs } from './breadcrumbs';
import { NodeTable } from './node-table';

/**
 * A folder: its trail, its contents, and the actions available on them.
 *
 * The same component serves an owner and a guest. What differs is the capabilities the API
 * reports, which decide what is rendered — so a guest is never shown a control that would be
 * refused, and there is no second read-only copy of this screen to keep in step.
 */
export function Explorer({ nodeId }: { nodeId: string }) {
  const detail = useNode(nodeId);
  const children = useChildren(nodeId);
  const queue = useUploadQueue();
  const filePicker = useRef<HTMLInputElement>(null);

  // Derived during render rather than reset in an effect: when the folder changes the query
  // is simply no longer the one that was typed, and an effect would render the old results
  // once before clearing them.
  const [typed, setTyped] = useState({ nodeId, value: '' });
  const query = typed.nodeId === nodeId ? typed.value : '';
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renaming, setRenaming] = useState<Node | null>(null);
  const [moving, setMoving] = useState<Node | null>(null);
  const [deleting, setDeleting] = useState<Node | null>(null);
  const [sharing, setSharing] = useState<Node | null>(null);

  if (detail.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        <div className="rounded-lg border border-border bg-surface">
          <Skeleton rows={6} />
        </div>
      </div>
    );
  }

  // Covers both "deleted while you were looking at it" and "your access was revoked": the two
  // are deliberately indistinguishable, and the message says so without guessing.
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { node, breadcrumbs, capabilities } = detail.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs trail={breadcrumbs} current={node.name} />

        <div className="flex items-center gap-2">
          <SearchInput
            key={nodeId}
            onChange={(value) => setTyped({ nodeId, value })}
            placeholder={`Search in ${node.name}`}
          />
          {capabilities.canShare && (
            <Button onClick={() => setSharing(node)}>
              <Icon.Share className="size-4" />
              Share
            </Button>
          )}
          {capabilities.canCreate && (
            <Button onClick={() => setCreatingFolder(true)}>
              <Icon.Plus className="size-4" />
              New folder
            </Button>
          )}
          {capabilities.canUpload && (
            <>
              <input
                ref={filePicker}
                type="file"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) void queue.enqueue(files, node.id);
                  // Reset so selecting the same file twice in a row still fires a change.
                  event.target.value = '';
                }}
              />
              <Button variant="primary" onClick={() => filePicker.current?.click()}>
                <Icon.Upload className="size-4" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {!capabilities.canUpload && (
        <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-muted">
          You have read-only access to this folder.
        </p>
      )}

      {query.length >= MIN_SEARCH_LENGTH ? (
        <SearchResults nodeId={node.id} query={query} />
      ) : (
      <UploadDropzone parentId={node.id} disabled={!capabilities.canUpload}>
        <NodeTable
          capabilities={capabilities}
          actions={{
            onRename: setRenaming,
            onMove: setMoving,
            onDelete: setDeleting,
            onShare: setSharing,
          }}
          query={{
            isPending: children.isPending,
            isError: children.isError,
            error: children.error,
            refetch: () => void children.refetch(),
            pages: children.data?.pages,
            hasNextPage: children.hasNextPage,
            isFetchingNextPage: children.isFetchingNextPage,
            fetchNextPage: () => void children.fetchNextPage(),
          }}
          emptyAction={
            capabilities.canUpload && (
              <Button variant="primary" onClick={() => filePicker.current?.click()}>
                <Icon.Upload className="size-4" />
                Upload documents
              </Button>
            )
          }
        />
      </UploadDropzone>
      )}

      <CreateFolderDialog
        parentId={node.id}
        open={creatingFolder}
        onOpenChange={setCreatingFolder}
      />
      <RenameDialog node={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
      <MoveDialog
        key={moving?.id ?? 'move'}
        node={moving}
        rootNodeId={breadcrumbs[0]?.id ?? node.id}
        onOpenChange={(open) => !open && setMoving(null)}
      />
      <DeleteDialog node={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
      <ShareDialog node={sharing} onOpenChange={(open) => !open && setSharing(null)} />
    </div>
  );
}
