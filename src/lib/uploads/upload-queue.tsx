'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '@/lib/api/client';
import { uploadApi } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/keys';
import type { ConflictStrategy, UploadConflict } from '@/lib/api/types';

export type UploadStatus =
  | 'awaiting-decision'
  | 'queued'
  | 'uploading'
  | 'finishing'
  | 'done'
  | 'failed'
  | 'canceled';

/** What the interface renders. Everything else about an upload is kept out of state. */
export interface UploadItem {
  id: string;
  fileName: string;
  parentId: string;
  sizeBytes: number;
  status: UploadStatus;
  /** 0–100, measured from the actual transfer rather than estimated. */
  progress: number;
  conflict?: UploadConflict;
  error?: string;
}

/** The parts of an upload that never need to trigger a render. */
interface UploadRecord {
  file: File;
  intentId: string;
  uploadUrl: string;
  contentType: string;
  xhr?: XMLHttpRequest;
}

interface UploadQueueValue {
  items: UploadItem[];
  enqueue: (files: File[], parentId: string) => Promise<void>;
  resolveConflict: (id: string, choice: ConflictStrategy | 'skip') => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
}

const UploadQueueContext = createContext<UploadQueueValue | null>(null);

/** Bytes go straight to storage, so this only bounds simultaneous transfers. */
const MAX_CONCURRENT = 3;

/**
 * The upload queue.
 *
 * It lives above the router outlet on purpose: a queue owned by the folder page would be
 * destroyed the moment someone opens another folder, cancelling uploads for a reason no user
 * could have predicted.
 *
 * URLs are signed for the whole batch up front, which is also when the API reports name
 * collisions — so the user is asked before any bytes move, not after waiting for a 50 MB
 * transfer. A decision changes only how the upload is completed; the transfer is never
 * repeated.
 */
export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queryClient = useQueryClient();

  // Files, signed URLs and in-flight requests are refs: they are never rendered, and holding
  // a File in state would copy it on every progress tick.
  const records = useRef(new Map<string, UploadRecord>());
  const itemsRef = useRef<UploadItem[]>([]);
  const running = useRef(0);

  const setAll = useCallback((next: (current: UploadItem[]) => UploadItem[]) => {
    setItems((current) => {
      const updated = next(current);
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<UploadItem>) => {
      setAll((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    },
    [setAll],
  );

  const invalidateFolder = useCallback(
    (parentId: string) => {
      void queryClient.invalidateQueries({ queryKey: ['children', parentId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats(parentId) });
    },
    [queryClient],
  );

  const run = useCallback(
    async (id: string, strategy: ConflictStrategy) => {
      const record = records.current.get(id);
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!record || !item) return;

      running.current += 1;
      patch(id, { status: 'uploading', progress: 0, error: undefined, conflict: undefined });

      try {
        await transfer(record, (progress) => patch(id, { progress }));

        patch(id, { status: 'finishing', progress: 100 });
        await uploadApi.complete({ intentId: record.intentId, onConflict: strategy });

        patch(id, { status: 'done' });
        records.current.delete(id);
        invalidateFolder(item.parentId);
      } catch (error) {
        if ((error as Error).message === 'canceled') {
          records.current.delete(id);
        } else if (error instanceof ApiError && error.code === 'NAME_CONFLICT') {
          // Someone took the name while the bytes were moving. The upload is intact: another
          // answer completes the same transfer rather than repeating it.
          patch(id, {
            status: 'awaiting-decision',
            conflict: (error.details as UploadConflict | undefined) ?? item.conflict,
          });
        } else {
          patch(id, { status: 'failed', error: (error as Error).message });
        }
      } finally {
        running.current -= 1;
        schedule();
      }
    },
    [invalidateFolder, patch], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Starts queued transfers up to the concurrency limit. Reads a ref, so it stays pure. */
  const schedule = useCallback(() => {
    for (const item of itemsRef.current) {
      if (running.current >= MAX_CONCURRENT) return;
      if (item.status !== 'queued' || !records.current.has(item.id)) continue;
      void run(item.id, 'fail');
    }
  }, [run]);

  const enqueue = useCallback(
    async (incoming: File[], parentId: string) => {
      // A dropped directory arrives as an entry with no file behind it. Uploading nothing and
      // saying nothing is the worst available response, so it is reported explicitly.
      const usable = incoming.filter((file) => file.size > 0);
      const skippedDirectories = incoming.length - usable.length;

      if (skippedDirectories > 0) {
        setAll((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            fileName:
              skippedDirectories === 1 ? 'A folder was dropped' : `${skippedDirectories} folders were dropped`,
            parentId,
            sizeBytes: 0,
            status: 'failed',
            progress: 0,
            error: 'Folders cannot be uploaded — open one and drop the files inside it.',
          },
        ]);
      }
      if (usable.length === 0) return;

      const staged = usable.map((file) => ({ id: crypto.randomUUID(), file }));
      setAll((current) => [
        ...current,
        ...staged.map(({ id, file }) => ({
          id,
          fileName: file.name,
          parentId,
          sizeBytes: file.size,
          status: 'queued' as UploadStatus,
          progress: 0,
        })),
      ]);

      try {
        // One request for the whole batch: a request per file would collide with the API's
        // own rate limit the first time someone drags in a folder's worth of documents.
        const presigned = await uploadApi.presign({
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
          records.current.set(id, {
            file,
            intentId: signed.intentId,
            uploadUrl: signed.uploadUrl,
            contentType: signed.contentType,
          });
          if (signed.conflict) {
            patch(id, { status: 'awaiting-decision', conflict: signed.conflict });
          }
        });
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'The upload could not be prepared';
        setAll((current) =>
          current.map((item) =>
            staged.some(({ id }) => id === item.id) && item.status === 'queued'
              ? { ...item, status: 'failed', error: message }
              : item,
          ),
        );
        return;
      }

      schedule();
    },
    [patch, schedule, setAll],
  );

  const resolveConflict = useCallback(
    (id: string, choice: ConflictStrategy | 'skip') => {
      if (choice === 'skip') {
        records.current.delete(id);
        patch(id, { status: 'canceled', conflict: undefined });
        return;
      }
      void run(id, choice);
    },
    [patch, run],
  );

  const cancel = useCallback(
    (id: string) => {
      records.current.get(id)?.xhr?.abort();
      records.current.delete(id);
      patch(id, { status: 'canceled' });
    },
    [patch],
  );

  const retry = useCallback(
    (id: string) => {
      if (!records.current.has(id)) {
        patch(id, { status: 'failed', error: 'Add the file again to retry' });
        return;
      }
      patch(id, { status: 'queued', error: undefined });
      schedule();
    },
    [patch, schedule],
  );

  const dismiss = useCallback(
    (id: string) => {
      records.current.delete(id);
      setAll((current) => current.filter((item) => item.id !== id));
    },
    [setAll],
  );

  const clearFinished = useCallback(() => {
    setAll((current) =>
      current.filter((item) => item.status !== 'done' && item.status !== 'canceled'),
    );
  }, [setAll]);

  const value = useMemo<UploadQueueValue>(
    () => ({ items, enqueue, resolveConflict, cancel, retry, dismiss, clearFinished }),
    [items, enqueue, resolveConflict, cancel, retry, dismiss, clearFinished],
  );

  return <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>;
}

/**
 * Sends the bytes.
 *
 * XMLHttpRequest rather than fetch, because only XHR reports upload progress — fetch can
 * report what it receives but not what it is sending, and a bar that jumps from 0 to 100 is
 * worse than no bar at all.
 */
function transfer(record: UploadRecord, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    record.xhr = xhr;

    xhr.open('PUT', record.uploadUrl);
    // Exactly the value the API signed: content type is part of the signature, so deriving it
    // again here would produce a mismatch that storage rejects with an opaque 403.
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

export function useUploadQueue(): UploadQueueValue {
  const value = useContext(UploadQueueContext);
  if (!value) throw new Error('useUploadQueue must be used inside UploadQueueProvider');
  return value;
}
