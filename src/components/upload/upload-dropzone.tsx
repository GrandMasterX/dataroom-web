'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useUploadQueue } from '@/lib/uploads/upload-queue';

/**
 * Drag-and-drop target wrapping the folder listing.
 *
 * The drop target is the whole listing area rather than a small panel: aiming at a strip is
 * fiddly, and the intent of dropping anywhere over a folder's contents is unambiguous.
 */
export function UploadDropzone({
  parentId,
  disabled = false,
  children,
}: {
  parentId: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const queue = useUploadQueue();
  const [isOver, setIsOver] = useState(false);
  // Drag events fire for every child element; counting enter/leave avoids the highlight
  // flickering as the pointer crosses rows.
  const depth = useRef(0);

  if (disabled) return <>{children}</>;

  const onDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    depth.current += 1;
    setIsOver(true);
  };

  const onDragLeave = () => {
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setIsOver(false);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth.current = 0;
    setIsOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void queue.enqueue(files, parentId);
  };

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn('relative rounded-lg transition-colors', isOver && 'ring-2 ring-accent')}
    >
      {children}
      {isOver && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-blue-50/80">
          <p className="text-sm font-medium text-accent">Drop files to upload to this folder</p>
        </div>
      )}
    </div>
  );
}
