'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useCreateFolder } from '@/lib/api/hooks';

const schema = z.object({ name: z.string().trim().min(1, 'Give the folder a name').max(255) });

export function CreateFolderDialog({
  parentId,
  open,
  onOpenChange,
}: {
  parentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateFolder();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      create.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const conflicted = create.error instanceof ApiError && create.error.code === 'NAME_CONFLICT';

  const submit = (onConflict: 'fail' | 'rename') =>
    form.handleSubmit((values) =>
      create.mutate(
        { parentId, name: values.name, onConflict },
        { onSuccess: () => onOpenChange(false) },
      ),
    )();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New folder"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {conflicted && (
            // The typed name is still in the field, so answering the conflict does not mean
            // typing it again.
            <Button variant="secondary" loading={create.isPending} onClick={() => submit('rename')}>
              Keep both
            </Button>
          )}
          <Button variant="primary" loading={create.isPending} onClick={() => submit('fail')}>
            Create
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit('fail');
        }}
        noValidate
      >
        <Field
          label="Name"
          autoFocus
          placeholder="04 Diligence"
          error={
            form.formState.errors.name?.message ??
            (conflicted ? 'A folder with this name already exists here' : (create.error as Error | null)?.message)
          }
          {...form.register('name')}
        />
      </form>
    </Dialog>
  );
}
