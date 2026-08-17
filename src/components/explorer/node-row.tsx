'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { formatBytes, formatRelativeDate } from '@/lib/format';
import type { Capabilities, Node } from '@/lib/api/types';
import { useNodeLinks } from './node-links';

export interface NodeRowActions {
  onRename: (node: Node) => void;
  onMove: (node: Node) => void;
  onDelete: (node: Node) => void;
  onShare: (node: Node) => void;
}

/**
 * One row: a folder or a file.
 *
 * The row is a link-like element rather than a link wrapping a menu, because a menu button
 * inside an anchor is invalid markup and makes keyboard interaction ambiguous. Enter and
 * Space open the item, which is what a list of files is expected to do.
 */
export function NodeRow({
  node,
  capabilities,
  actions,
}: {
  node: Node;
  capabilities: Capabilities;
  actions: NodeRowActions;
}) {
  const router = useRouter();
  const links = useNodeLinks();
  const href = node.type === 'FOLDER' ? links.folderHref(node.id) : links.fileHref(node.id);

  const open = () => router.push(href);
  const hasMenu =
    capabilities.canRename || capabilities.canMove || capabilities.canDelete || capabilities.canShare;

  return (
    <li
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 focus-within:bg-slate-50"
      onDoubleClick={open}
    >
      <span className={node.type === 'FOLDER' ? 'text-blue-600' : 'text-slate-400'}>
        {node.type === 'FOLDER' ? (
          <Icon.Folder className="size-4.5" />
        ) : (
          <Icon.FileText className="size-4.5" />
        )}
      </span>

      <button
        type="button"
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
        title={node.name}
      >
        {node.name}
      </button>

      <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
        {node.type === 'FILE' && node.sizeBytes != null ? formatBytes(node.sizeBytes) : '—'}
      </span>
      <span className="hidden w-32 shrink-0 text-right text-xs text-muted md:block">
        {formatRelativeDate(node.updatedAt)}
      </span>

      {hasMenu ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={`Actions for ${node.name}`}
            className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-slate-200 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <Icon.More className="size-4" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="dr-enter min-w-44 rounded-md border border-border bg-surface p-1 shadow-lg"
            >
              {capabilities.canShare && (
                <MenuItem onSelect={() => actions.onShare(node)} icon={<Icon.Share className="size-4" />}>
                  Share
                </MenuItem>
              )}
              {capabilities.canRename && (
                <MenuItem onSelect={() => actions.onRename(node)} icon={<Icon.Pencil className="size-4" />}>
                  Rename
                </MenuItem>
              )}
              {capabilities.canMove && (
                <MenuItem onSelect={() => actions.onMove(node)} icon={<Icon.FolderOpen className="size-4" />}>
                  Move to…
                </MenuItem>
              )}
              {capabilities.canDelete && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <MenuItem
                    onSelect={() => actions.onDelete(node)}
                    icon={<Icon.Trash className="size-4" />}
                    destructive
                  >
                    Delete
                  </MenuItem>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        // Keeps the column width stable between owner and guest views, so the listing does
        // not visibly reflow depending on who is looking at it.
        <span className="block size-7" aria-hidden />
      )}
    </li>
  );
}

function MenuItem({
  children,
  icon,
  onSelect,
  destructive = false,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-slate-100 ${
        destructive ? 'text-danger data-[highlighted]:bg-danger-surface' : ''
      }`}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}
