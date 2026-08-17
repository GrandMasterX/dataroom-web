'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Built on Radix rather than hand-rolled.
 *
 * A modal has to trap focus, restore it to whatever opened it, close on Escape and label
 * itself for assistive technology. Every one of those is easy to get subtly wrong, and the
 * result is a dialog that traps a keyboard user rather than helping them.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  destructive?: boolean;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
        <RadixDialog.Content
          className={cn(
            'dr-enter fixed left-1/2 top-1/2 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-surface p-5 shadow-xl',
          )}
        >
          <RadixDialog.Title
            className={cn('text-base font-semibold', destructive && 'text-danger')}
          >
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description asChild>
              <div className="mt-1.5 text-sm text-muted">{description}</div>
            </RadixDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
