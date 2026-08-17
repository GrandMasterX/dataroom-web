import { GuestLinks } from '@/components/explorer/node-links';
import { ShareTokenBoundary } from '@/components/share/share-token-boundary';
import { Icon } from '@/components/ui/icons';
import { UploadQueueProvider } from '@/lib/uploads/upload-queue';

/**
 * The frame for someone holding a public link.
 *
 * Deliberately not the signed-in shell: a guest has no account, nothing to sign out of, and
 * no other rooms to navigate to. Showing them a header full of controls they cannot use
 * would be noise at best and misleading at worst.
 */
export default async function SharedLayout({ children, params }: LayoutProps<'/s/[token]'>) {
  const { token } = await params;

  return (
    <ShareTokenBoundary token={token}>
      <GuestLinks token={token}>
        {/* The queue is inert here — a guest has no upload capability, so nothing can be
            enqueued — but the explorer is one component tree and expects the provider. */}
        <UploadQueueProvider>
          <div className="min-h-dvh">
            <header className="border-b border-border bg-surface">
              <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
                <span className="grid size-7 place-items-center rounded bg-accent text-accent-foreground">
                  <Icon.Folder className="size-4" />
                </span>
                <span className="text-sm font-semibold">Data Room</span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                  <Icon.Link className="size-3.5" />
                  Shared with you · read-only
                </span>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </div>
        </UploadQueueProvider>
      </GuestLinks>
    </ShareTokenBoundary>
  );
}
