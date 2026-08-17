'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { Icon } from '@/components/ui/icons';
import { ApiError } from '@/lib/api/client';
import {
  useCreateShareLink,
  useGrantAccess,
  useNodeShares,
  useRevokeGrant,
  useRevokeShareLink,
} from '@/lib/api/hooks';
import type { Node } from '@/lib/api/types';

const inviteSchema = z.object({ email: z.email('Enter a valid email address') });

/**
 * Both ways of sharing in one place, because the question a user has is "who can see this",
 * not "which mechanism do I want".
 */
export function ShareDialog({
  node,
  onOpenChange,
}: {
  node: Node | null;
  onOpenChange: (open: boolean) => void;
}) {
  const shares = useNodeShares(node?.id, node !== null);
  const createLink = useCreateShareLink();
  const revokeLink = useRevokeShareLink();
  const grant = useGrantAccess();
  const revokeGrant = useRevokeGrant();
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const link = shares.data?.link;
  const publicUrl = link ? `${window.location.origin}/s/${link.token}` : undefined;

  const invite = form.handleSubmit((values) => {
    if (!node) return;
    grant.mutate(
      { nodeId: node.id, email: values.email },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Dialog
      open={node !== null}
      onOpenChange={onOpenChange}
      title={`Share “${node?.name ?? ''}”`}
      description="Recipients get read-only access to this item and everything inside it."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-sm font-medium">Anyone with the link</h3>
          {link ? (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={publicUrl ?? ''}
                  aria-label="Public link"
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-9 flex-1 rounded-md border border-border bg-slate-50 px-3 font-mono text-xs"
                />
                <Button
                  onClick={() => {
                    void navigator.clipboard.writeText(publicUrl ?? '');
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Icon.Link className="size-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={revokeLink.isPending}
                onClick={() => node && revokeLink.mutate({ linkId: link.id, nodeId: node.id })}
              >
                Turn off link sharing
              </Button>
            </div>
          ) : (
            <div className="mt-2">
              <p className="mb-2 text-sm text-muted">
                Anyone holding the link can view this item. Turn it off at any time.
              </p>
              <Button
                loading={createLink.isPending}
                onClick={() => node && createLink.mutate({ nodeId: node.id })}
              >
                <Icon.Link className="size-4" />
                Create link
              </Button>
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <h3 className="text-sm font-medium">Specific people</h3>
          <form onSubmit={invite} className="mt-2 flex items-end gap-2" noValidate>
            <div className="flex-1">
              <Field
                label="Invite by email"
                type="email"
                placeholder="counsel@beacon.com"
                error={
                  form.formState.errors.email?.message ??
                  (grant.error instanceof ApiError ? grant.error.message : undefined)
                }
                {...form.register('email')}
              />
            </div>
            <Button type="submit" variant="primary" loading={grant.isPending}>
              Invite
            </Button>
          </form>
          {/* No email is sent from this service, so the owner is told what to do next rather
              than left assuming a message went out. */}
          <p className="mt-1.5 text-xs text-muted">
            They will see it under “Shared with you” after signing in with that address.
          </p>

          {shares.data && shares.data.grants.length > 0 && (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {shares.data.grants.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 px-3 py-2">
                  <Icon.Users className="size-4 text-muted" />
                  <span className="flex-1 truncate text-sm">{entry.email}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revokeGrant.isPending}
                    onClick={() => node && revokeGrant.mutate({ grantId: entry.id, nodeId: node.id })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
