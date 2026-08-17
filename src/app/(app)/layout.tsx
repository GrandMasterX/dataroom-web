import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { UploadQueuePanel } from '@/components/upload/upload-queue-panel';
import { UploadQueueProvider } from '@/lib/uploads/upload-queue';

/**
 * Everything under this layout requires a session.
 *
 * The check happens on the server, before anything renders, so an unauthenticated visitor is
 * redirected rather than shown a page that fills in with errors a moment later. The cookie's
 * presence is not proof of a valid session — the API decides that — but it is the right gate
 * for deciding what to render.
 *
 * The upload queue is mounted here rather than inside a folder page: uploads must survive
 * navigating between folders, and a provider owned by the page would be torn down on the
 * first click.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  if (!store.has('dr_refresh')) redirect('/login');

  return (
    <UploadQueueProvider>
      <AppShell>{children}</AppShell>
      <UploadQueuePanel />
    </UploadQueueProvider>
  );
}
