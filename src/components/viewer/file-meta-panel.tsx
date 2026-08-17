'use client';

import { useVersions } from '@/lib/api/hooks';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { Capabilities, PreviewUrl } from '@/lib/api/types';

/**
 * Details beside the document: what it is, and — for the owner — how it got here.
 *
 * Version history is requested only when the API says this caller may see it. It names the
 * people who uploaded each version, which is internal information about the seller's team
 * rather than something a counterparty reviewing documents needs.
 */
export function FileMetaPanel({
  nodeId,
  preview,
  capabilities,
}: {
  nodeId: string;
  preview: PreviewUrl;
  capabilities: Capabilities;
}) {
  const versions = useVersions(nodeId, capabilities.canViewVersionHistory);

  return (
    <aside className="space-y-5 rounded-lg border border-border bg-surface p-4">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Details</h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Size</dt>
            <dd>{formatBytes(preview.sizeBytes)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Type</dt>
            <dd className="truncate" title={preview.mimeType}>
              {preview.mimeType === 'application/pdf' ? 'PDF' : preview.mimeType}
            </dd>
          </div>
        </dl>
      </section>

      {capabilities.canViewVersionHistory && (
        <section className="border-t border-border pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Versions</h2>

          {versions.isPending && <p className="mt-2 text-sm text-muted">Loading…</p>}

          {versions.data && (
            <ol className="mt-2 space-y-2.5">
              {versions.data.map((version) => (
                <li key={version.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Version {version.versionNumber}</span>
                    {version.isCurrent && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-accent">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {formatBytes(version.sizeBytes)} · {version.createdBy}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(version.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}

          {versions.data?.length === 1 && (
            <p className="mt-2 text-xs text-muted">
              Uploading a file with the same name offers to add a version here.
            </p>
          )}
        </section>
      )}
    </aside>
  );
}
