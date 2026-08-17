'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { formatBytes } from '@/lib/format';
import { useUploadQueue, type UploadItem } from '@/lib/uploads/upload-queue';

/**
 * The queue, pinned to the corner rather than shown inside the folder.
 *
 * Uploads outlive navigation, so their progress has to be visible from wherever the user
 * goes next; putting it in the listing would tie it to one folder again.
 */
export function UploadQueuePanel() {
  const queue = useUploadQueue();
  if (queue.items.length === 0) return null;

  const active = queue.items.filter((item) =>
    ['queued', 'uploading', 'finishing', 'awaiting-decision'].includes(item.status),
  );

  return (
    <aside
      aria-label="Uploads"
      className="dr-enter fixed bottom-4 right-4 z-20 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">
          {active.length > 0 ? `Uploading ${active.length}` : 'Uploads'}
        </h2>
        <Button size="sm" variant="ghost" onClick={queue.clearFinished}>
          Clear finished
        </Button>
      </header>

      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {queue.items.map((item) => (
          <UploadRow key={item.id} item={item} />
        ))}
      </ul>
    </aside>
  );
}

function UploadRow({ item }: { item: UploadItem }) {
  const queue = useUploadQueue();

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm" title={item.fileName}>
            {item.fileName}
          </span>
          <span className="text-xs text-muted">
            {item.sizeBytes > 0 && `${formatBytes(item.sizeBytes)} · `}
            <StatusLabel item={item} />
          </span>
        </span>

        {item.status === 'uploading' && (
          <Button size="sm" variant="ghost" onClick={() => queue.cancel(item.id)}>
            Cancel
          </Button>
        )}
        {item.status === 'failed' && (
          <Button size="sm" variant="ghost" onClick={() => queue.retry(item.id)}>
            Retry
          </Button>
        )}
        {(item.status === 'done' || item.status === 'canceled') && (
          <button
            aria-label={`Dismiss ${item.fileName}`}
            className="rounded p-1 text-muted hover:bg-slate-100"
            onClick={() => queue.dismiss(item.id)}
          >
            <Icon.X className="size-3.5" />
          </button>
        )}
      </div>

      {(item.status === 'uploading' || item.status === 'finishing') && (
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${item.fileName}`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {item.status === 'awaiting-decision' && <ConflictChoice item={item} />}
    </li>
  );
}

/**
 * Asked before the bytes move, and phrased as the outcome rather than as a strategy name.
 *
 * "Add as a new version" is offered only against an existing file: a collision with a folder
 * cannot be resolved that way, and showing the option would be a control that does nothing.
 */
function ConflictChoice({ item }: { item: UploadItem }) {
  const queue = useUploadQueue();
  const canVersion = item.conflict?.existingType === 'FILE';

  return (
    <div className="mt-2 rounded-md border border-border bg-slate-50 p-2">
      <p className="text-xs text-foreground">
        {canVersion
          ? 'A file with this name is already here.'
          : 'A folder with this name is already here.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="primary" onClick={() => queue.resolveConflict(item.id, 'rename')}>
          Keep both
        </Button>
        {canVersion && (
          <Button size="sm" onClick={() => queue.resolveConflict(item.id, 'newVersion')}>
            Add as new version
            {item.conflict ? ` (v${item.conflict.versionCount + 1})` : ''}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => queue.resolveConflict(item.id, 'skip')}>
          Skip
        </Button>
      </div>
    </div>
  );
}

function StatusLabel({ item }: { item: UploadItem }) {
  switch (item.status) {
    case 'queued':
      return <>Waiting</>;
    case 'uploading':
      return <>{item.progress}%</>;
    case 'finishing':
      return <>Finishing</>;
    case 'done':
      return <span className="text-emerald-700">Uploaded</span>;
    case 'canceled':
      return <>Skipped</>;
    case 'awaiting-decision':
      return <span className="text-amber-700">Needs a decision</span>;
    case 'failed':
      return <span className="text-danger">{item.error ?? 'Failed'}</span>;
  }
}
