'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { useSession } from '@/lib/api/hooks';
import { useLogout } from '@/lib/auth/use-auth';

/**
 * The frame around every signed-in page: identity, a way out, and a link home.
 *
 * Guests viewing a public link get a different frame — they have no account and nothing to
 * sign out of — so this component is not reused there.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const logout = useLogout();
  const user = session.data?.user;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-7 place-items-center rounded bg-accent text-accent-foreground">
              <Icon.Folder className="size-4" />
            </span>
            Data Room
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
              <Button
                size="sm"
                variant="ghost"
                loading={logout.isPending}
                onClick={() => logout.mutate()}
              >
                <Icon.LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
