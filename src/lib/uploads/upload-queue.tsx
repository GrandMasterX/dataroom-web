'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { uploadApi } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/keys';
import { UploadEngine, type UploadItem } from './upload-engine';

export type { UploadItem, UploadStatus } from './upload-engine';

const UploadEngineContext = createContext<UploadEngine | null>(null);

/**
 * Mounts the upload engine and lets React read from it.
 *
 * The provider sits above the router outlet on purpose: a queue owned by the folder page
 * would be destroyed the moment someone opens another folder, cancelling uploads for a reason
 * no user could have predicted.
 *
 * All the queue's behaviour lives in UploadEngine — plain TypeScript, no hooks — and React
 * only subscribes to its snapshots. Uploads are event-driven and outlive renders, so
 * expressing them as callbacks and effects fought the model rather than using it.
 */
export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const engine = useMemo(
    () =>
      new UploadEngine({
        presign: uploadApi.presign,
        complete: uploadApi.complete,
        onFolderChanged: (parentId) => {
          void queryClient.invalidateQueries({ queryKey: ['children', parentId] });
          void queryClient.invalidateQueries({ queryKey: queryKeys.stats(parentId) });
        },
      }),
    [queryClient],
  );

  return <UploadEngineContext.Provider value={engine}>{children}</UploadEngineContext.Provider>;
}

export interface UploadQueue {
  items: UploadItem[];
  enqueue: (files: File[], parentId: string) => void;
  resolveConflict: UploadEngine['resolveConflict'];
  cancel: UploadEngine['cancel'];
  retry: UploadEngine['retry'];
  dismiss: UploadEngine['dismiss'];
  clearFinished: UploadEngine['clearFinished'];
}

export function useUploadQueue(): UploadQueue {
  const engine = useContext(UploadEngineContext);
  if (!engine) throw new Error('useUploadQueue must be used inside UploadQueueProvider');

  const items = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    // The server has no queue; rendering an empty one avoids a hydration mismatch.
    () => EMPTY,
  );

  return {
    items,
    enqueue: (files, parentId) => void engine.enqueue(files, parentId),
    resolveConflict: (id, choice) => engine.resolveConflict(id, choice),
    cancel: (id) => engine.cancel(id),
    retry: (id) => engine.retry(id),
    dismiss: (id) => engine.dismiss(id),
    clearFinished: () => engine.clearFinished(),
  };
}

const EMPTY: UploadItem[] = [];
