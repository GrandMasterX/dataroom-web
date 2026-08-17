'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icons';
import { ApiError } from '@/lib/api/client';
import { useChildren, useMoveNode, useNode } from '@/lib/api/hooks';
import type { Node } from '@/lib/api/types';

/**
 * Picking a destination by browsing, rather than by choosing from a flattened list.
 *
 * The item being moved is not selectable, and the API refuses a move into the item's own
 * subtree. That check is not duplicated here: doing so would need the tree's internal paths
 * on the client, and a second implementation of the rule is a second thing to get wrong. The
 * server's answer is shown instead.
 */
export function MoveDialog({
  node,
  rootNodeId,
  onOpenChange,
}: {
  node: Node | null;
  rootNodeId: string;
  onOpenChange: (open: boolean) => void;
}) {
  // Starts where the item currently lives, which is where someone reorganising is most
  // likely to look. The caller keys this component by node id, so opening it for a different
  // item mounts it fresh — no effect resetting state after the first render.
  const [browsingId, setBrowsingId] = useState(node?.parentId ?? rootNodeId);
  const move = useMoveNode();

  const current = useNode(node ? browsingId : undefined);
  const folders = useChildren(node ? browsingId : undefined, 'FOLDER');

  const items = (folders.data?.pages ?? []).flatMap((page) => page.items);
  const parentTrail = current.data?.breadcrumbs ?? [];
  const alreadyHere = node?.parentId === browsingId;

  return (
    <Dialog
      open={node !== null}
      onOpenChange={onOpenChange}
      title={`Move “${node?.name ?? ''}”`}
      description="Choose the folder to move it into."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={move.isPending}
            disabled={alreadyHere}
            onClick={() => {
              if (!node) return;
              move.mutate(
                { nodeId: node.id, fromParentId: node.parentId, targetParentId: browsingId },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            {alreadyHere ? 'Already here' : 'Move here'}
          </Button>
        </>
      }
    >
      <div className="rounded-md border border-border">
        <div className="flex items-center gap-1 border-b border-border px-3 py-2 text-sm">
          {parentTrail.length > 0 && (
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-muted hover:bg-slate-100"
              onClick={() => setBrowsingId(parentTrail[parentTrail.length - 1].id)}
            >
              ← Up
            </button>
          )}
          <span className="truncate font-medium">{current.data?.node.name ?? '…'}</span>
        </div>

        <ul className="max-h-64 overflow-y-auto">
          {folders.isPending && <li className="px-3 py-3 text-sm text-muted">Loading…</li>}
          {items.length === 0 && !folders.isPending && (
            <li className="px-3 py-3 text-sm text-muted">No subfolders here.</li>
          )}
          {items.map((folder) => {
            const isSelf = folder.id === node?.id;
            return (
              <li key={folder.id}>
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => setBrowsingId(folder.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-muted"
                  title={isSelf ? 'An item cannot be moved into itself' : undefined}
                >
                  <Icon.Folder className="size-4 text-blue-600" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {!isSelf && <Icon.ChevronRight className="size-4 text-slate-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {move.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {move.error instanceof ApiError && move.error.code === 'NAME_CONFLICT'
            ? 'Something with this name is already in that folder.'
            : (move.error as Error).message}
        </p>
      )}
    </Dialog>
  );
}
