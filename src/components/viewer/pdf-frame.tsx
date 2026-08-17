'use client';

import { Icon } from '@/components/ui/icons';

/**
 * Renders the document with the browser's own PDF viewer.
 *
 * No PDF library is bundled: Chrome, Safari, Firefox and Edge all ship a viewer with search,
 * zoom and printing, and adding a second one would cost hundreds of kilobytes to deliver a
 * worse version of what is already installed.
 *
 * Note on the missing `sandbox` attribute — it was there, and it broke the feature. Chrome
 * refuses to run its PDF viewer inside a sandboxed frame and renders "This page has been
 * blocked by Chrome" instead, so the attribute bought nothing and cost the whole document
 * view. What the safety actually rests on is upstream:
 *
 *  - only `application/pdf` is ever served inline; every other type is sent as an attachment,
 *    so an uploaded HTML file cannot be rendered at all;
 *  - the response content type is pinned when the URL is signed rather than taken from what
 *    was stored, so a client cannot relabel its own upload into something scriptable;
 *  - the object is served from the storage origin, which is not this app's origin and has no
 *    access to its cookies or storage.
 */
export function PdfFrame({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="relative h-[calc(100dvh-16rem)] min-h-[28rem] overflow-hidden rounded-lg border border-border bg-slate-100">
      <iframe
        // Keyed by URL so a refreshed signature replaces the frame rather than leaving a
        // stale one that starts failing when the old signature expires.
        key={url}
        src={url}
        title={fileName}
        className="size-full"
      />
    </div>
  );
}

/** Shown for anything the browser will not render inline. */
export function DownloadCard({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="grid min-h-[20rem] place-items-center rounded-lg border border-dashed border-border bg-surface">
      <div className="text-center">
        <Icon.File className="mx-auto size-8 text-muted" />
        <p className="mt-3 text-sm font-medium">{fileName}</p>
        <p className="mt-1 text-sm text-muted">
          This file type is not displayed in the browser.
        </p>
        <a
          href={url}
          download
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-accent-foreground hover:bg-blue-800"
        >
          <Icon.Download className="size-4" />
          Download
        </a>
      </div>
    </div>
  );
}
