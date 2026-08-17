'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useRenameNode } from '@/lib/api/hooks';
import type { Node } from '@/lib/api/types';

const schema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(255) });

export function RenameDialog({
  node,
  onOpenChange,
}: {
  node: Node | null;
  onOpenChange: (open: boolean) => void;
}) {
  const rename = useRenameNode();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (node) {
      form.reset({ name: node.name });
      rename.reset();
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const conflicted = rename.error instanceof ApiError && rename.error.code === 'NAME_CONFLICT';

  const submit = (onConflict: 'fail' | 'rename') =>
    form.handleSubmit((values) => {
      if (!node) return;
      rename.mutate(
        { nodeId: node.id, parentId: node.parentId, name: values.name, onConflict },
        { onSuccess: () => onOpenChange(false) },
      );
    })();

  return (
    <Dialog
      open={node !== null}
      onOpenChange={onOpenChange}
      title={node?.type === 'FOLDER' ? 'Rename folder' : 'Rename file'}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {conflicted && (
            <Button variant="secondary" loading={rename.isPending} onClick={() => submit('rename')}>
              Keep both
            </Button>
          )}
          <Button variant="primary" loading={rename.isPending} onClick={() => submit('fail')}>
            Rename
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
          onFocus={(event) => {
            // Selecting the stem rather than the whole value: renaming a file usually means
            // changing the name, not the extension.
            const value = event.target.value;
            const lastDot = value.lastIndexOf('.');
            event.target.setSelectionRange(0, lastDot > 0 ? lastDot : value.length);
          }}
          error={
            form.formState.errors.name?.message ??
            (conflicted
              ? 'Something with this name already exists in this folder'
              : (rename.error as Error | null)?.message)
          }
          {...form.register('name')}
        />
      </form>
    </Dialog>
  );
}
