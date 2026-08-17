'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { useCreateDataRoom } from '@/lib/api/hooks';

const schema = z.object({
  name: z.string().trim().min(1, 'Give the data room a name').max(255),
});

export function CreateDataRoomDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const create = useCreateDataRoom();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  // Reset when it reopens, so a previous attempt's text and error do not reappear.
  useEffect(() => {
    if (open) {
      form.reset();
      create.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (room) => {
        onOpenChange(false);
        // Straight into the empty room: the next thing anyone does is add documents.
        router.push(`/d/${room.id}/f/${room.rootNodeId}`);
      },
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New data room"
      description="A data room is the top-level folder for one transaction."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-room" variant="primary" loading={create.isPending}>
            Create
          </Button>
        </>
      }
    >
      <form id="create-room" onSubmit={submit} noValidate>
        <Field
          label="Name"
          autoFocus
          placeholder="Project Beacon"
          error={form.formState.errors.name?.message ?? (create.error as Error | null)?.message}
          {...form.register('name')}
        />
      </form>
    </Dialog>
  );
}
