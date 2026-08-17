import { ApiError } from '@/lib/api/client';
import type { ConflictStrategy, PresignBatchResult, UploadConflict, UploadResult } from '@/lib/api/types';

export type UploadStatus =
  | 'awaiting-decision'
  | 'queued'
  | 'uploading'
  | 'finishing'
  | 'done'
  | 'failed'
  | 'canceled';

/** What the interface renders. Everything else about an upload stays inside the engine. */
export interface UploadItem {
  readonly id: string;
  readonly fileName: string;
  readonly parentId: string;
  readonly sizeBytes: number;
  readonly status: UploadStatus;
  /** 0–100, measured from the actual transfer rather than estimated. */
  readonly progress: number;
  readonly conflict?: UploadConflict;
  readonly error?: string;
}

interface UploadRecord {
  file: File;
  intentId: string;
  uploadUrl: string;
  contentType: string;
  xhr?: XMLHttpRequest;
}

export interface UploadEngineDeps {
  presign: (input: {
    parentId: string;
    items: { fileName: string; mimeType: string; sizeBytes: number }[];
  }) => Promise<PresignBatchResult>;
  complete: (input: { intentId: string; onConflict?: ConflictStrategy }) => Promise<UploadResult>;
  /** Called after a file lands, so the folder that received it can be refreshed. */
  onFolderChanged: (parentId: string) => void;
}

/** Bytes go straight to storage, so this only bounds simultaneous transfers. */
const MAX_CONCURRENT = 3;

/**
 * The upload queue, as plain TypeScript.
 *
 * Uploads are imperative and long-lived: they outlive renders, continue across navigation,
 * and are driven by events rather than by props. Expressing that as a web of useCallbacks
 * meant mutually recursive callbacks and a side effect inside a state updater — which React
 * may call twice — so the machinery moved here, where it is ordinary code that can be read
 * top to bottom and tested without a renderer.
 *
 * React subscribes to snapshots; it never reaches inside.
 */
export class UploadEngine {
  private items: UploadItem[] = [];
  private readonly records = new Map<string, UploadRecord>();
  private readonly listeners = new Set<() => void>();
  private running = 0;

  constructor(private readonly deps: UploadEngineDeps) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Stable identity while nothing changes, which is what useSyncExternalStore requires. */
  getSnapshot = (): UploadItem[] => this.items;

  /**
   * Accepts dropped or selected files and signs the whole batch in one request.
   *
   * One request rather than one per file: per-file signing would collide with the API's own
   * rate limit the first time somebody drags in a folder's worth of documents. Collisions
   * come back in that same response, so the user is asked before any bytes move.
   */
  async enqueue(incoming: File[], parentId: string): Promise<void> {
    // A dropped directory arrives as an entry with no file behind it. Uploading nothing and
    // saying nothing is the worst available response.
    const usable = incoming.filter((file) => file.size > 0);
    const skippedDirectories = incoming.length - usable.length;

    if (skippedDirectories > 0) {
      this.append({
        id: crypto.randomUUID(),
        fileName:
          skippedDirectories === 1
            ? 'A folder was dropped'
            : `${skippedDirectories} folders were dropped`,
        parentId,
        sizeBytes: 0,
        status: 'failed',
        progress: 0,
        error: 'Folders cannot be uploaded — open one and drop the files inside it.',
      });
    }
    if (usable.length === 0) return;

    const staged = usable.map((file) => ({ id: crypto.randomUUID(), file }));
    for (const { id, file } of staged) {
      this.append({
        id,
        fileName: file.name,
        parentId,
        sizeBytes: file.size,
        status: 'queued',
        progress: 0,
      });
    }

    try {
      const presigned = await this.deps.presign({
        parentId,
        items: staged.map(({ file }) => ({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        })),
      });

      staged.forEach(({ id, file }, index) => {
        const signed = presigned.items[index];
        if (!signed) return;
        this.records.set(id, {
          file,
          intentId: signed.intentId,
          uploadUrl: signed.uploadUrl,
          contentType: signed.contentType,
        });
        if (signed.conflict) {
          this.patch(id, { status: 'awaiting-decision', conflict: signed.conflict });
        }
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'The upload could not be prepared';
      for (const { id } of staged) {
        if (this.find(id)?.status === 'queued') this.patch(id, { status: 'failed', error: message });
      }
      return;
    }

    this.schedule();
  }

  resolveConflict(id: string, choice: ConflictStrategy | 'skip'): void {
    if (choice === 'skip') {
      this.records.delete(id);
      this.patch(id, { status: 'canceled', conflict: undefined });
      return;
    }
    void this.run(id, choice);
  }

  cancel(id: string): void {
    this.records.get(id)?.xhr?.abort();
    this.records.delete(id);
    this.patch(id, { status: 'canceled' });
  }

  retry(id: string): void {
    if (!this.records.has(id)) {
      // The file itself is gone — a page reload, or the upload already consumed it. Saying so
      // beats a retry button that silently does nothing.
      this.patch(id, { status: 'failed', error: 'Add the file again to retry' });
      return;
    }
    this.patch(id, { status: 'queued', error: undefined });
    this.schedule();
  }

  dismiss(id: string): void {
    this.records.delete(id);
    this.items = this.items.filter((item) => item.id !== id);
    this.emit();
  }

  clearFinished(): void {
    this.items = this.items.filter(
      (item) => item.status !== 'done' && item.status !== 'canceled',
    );
    this.emit();
  }

  /** Starts queued transfers up to the concurrency limit. */
  private schedule(): void {
    for (const item of this.items) {
      if (this.running >= MAX_CONCURRENT) return;
      if (item.status !== 'queued' || !this.records.has(item.id)) continue;
      void this.run(item.id, 'fail');
    }
  }

  private async run(id: string, strategy: ConflictStrategy): Promise<void> {
    const record = this.records.get(id);
    const item = this.find(id);
    if (!record || !item) return;

    this.running += 1;
    this.patch(id, { status: 'uploading', progress: 0, error: undefined, conflict: undefined });

    try {
      await this.transfer(record, (progress) => this.patch(id, { progress }));

      this.patch(id, { status: 'finishing', progress: 100 });
      await this.deps.complete({ intentId: record.intentId, onConflict: strategy });

      this.patch(id, { status: 'done' });
      this.records.delete(id);
      this.deps.onFolderChanged(item.parentId);
    } catch (error) {
      if ((error as Error).message === 'canceled') {
        this.records.delete(id);
      } else if (error instanceof ApiError && error.code === 'NAME_CONFLICT') {
        // Someone took the name while the bytes were moving. The transfer is intact, so
        // another answer completes the same upload rather than repeating it.
        this.patch(id, {
          status: 'awaiting-decision',
          conflict: (error.details as UploadConflict | undefined) ?? item.conflict,
        });
      } else {
        this.patch(id, { status: 'failed', error: (error as Error).message });
      }
    } finally {
      this.running -= 1;
      this.schedule();
    }
  }

  /**
   * Sends the bytes.
   *
   * XMLHttpRequest rather than fetch, because only XHR reports upload progress — fetch can
   * report what it receives but not what it is sending, and a bar that jumps from 0 to 100 is
   * worse than no bar at all.
   */
  private transfer(record: UploadRecord, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      record.xhr = xhr;

      xhr.open('PUT', record.uploadUrl);
      // Exactly the value the API signed: the content type is part of the signature, so
      // deriving it again here would produce a mismatch that storage rejects with an opaque
      // 403.
      xhr.setRequestHeader('Content-Type', record.contentType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Storage rejected the upload (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('canceled'));

      xhr.send(record.file);
    });
  }

  private find(id: string): UploadItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  private append(item: UploadItem): void {
    this.items = [...this.items, item];
    this.emit();
  }

  private patch(id: string, changes: Partial<UploadItem>): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...changes } : item));
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
