'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icons';

export const MIN_SEARCH_LENGTH = 3;

/**
 * Filename search within the current folder's subtree.
 *
 * Debounced, and short queries are never sent: below three characters the server rejects
 * them anyway, because fewer characters produce no complete trigrams and every keystroke
 * would scan the whole room. Saying so in the field is friendlier than a rejected request.
 */
export function SearchInput({
  onChange,
  placeholder,
}: {
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  // The only effect here syncs with something outside React — a timer — which is what
  // effects are for. Mirroring a prop into state and resetting it in a second effect is not;
  // the caller remounts this component instead (see Explorer), so a folder change starts it
  // fresh without a cascading render.
  useEffect(() => {
    const timer = window.setTimeout(() => onChange(draft.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [draft, onChange]);

  return (
    <div className="relative">
      <Icon.Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label="Search by file name"
        className="h-9 w-56 rounded-md border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted"
      />
    </div>
  );
}
