'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useDataRooms } from '@/lib/api/hooks';
import { CreateDataRoomDialog } from './create-data-room-dialog';
import { DataRoomCard } from './data-room-card';

export function DataRoomList() {
  const rooms = useDataRooms();
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Your data rooms</h1>
          <p className="text-sm text-muted">Private until you share them.</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Icon.Plus className="size-4" />
          New data room
        </Button>
      </header>

      {rooms.isPending && <Skeleton rows={3} />}

      {rooms.isError && <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />}

      {rooms.data?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface">
          <EmptyState
            icon={<Icon.FolderOpen className="size-8" />}
            title="No data rooms yet"
            description="Create one for a transaction, then upload the documents the other side needs to review."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Icon.Plus className="size-4" />
                New data room
              </Button>
            }
          />
        </div>
      )}

      {rooms.data && rooms.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((room) => (
            <DataRoomCard key={room.id} room={room} />
          ))}
        </div>
      )}

      <CreateDataRoomDialog open={creating} onOpenChange={setCreating} />
    </section>
  );
}
