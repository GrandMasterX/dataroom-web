---
name: react-frontend-practices
description: React and Next.js App Router engineering practices for this project — server vs client component boundaries, TanStack Query as the only server-state owner (never fetch in useEffect), the four render states every data surface must handle, granular component decomposition, optimistic updates with rollback, upload progress via XHR, keyboard and focus behaviour for dialogs and file lists, virtualization, and forms with react-hook-form + zod. Use whenever you create or review a React component, page, hook, dialog, list or form, wire up data fetching or mutations, add a loading/empty/error state, or debug a stale UI, double fetch, lost focus or a re-render problem. Complements the official `frontend-design` skill, which covers visual design; this one covers correctness and structure.
---

# React / Next.js practices

This is a file-manager UI graded first on user experience and edge cases. That changes what "good React"
means here: the interesting states are not the happy path but *empty, loading, failed, and no-longer-
permitted*. Most of the rules below exist to make those states impossible to forget.

## Component boundaries

- Server Components are the default. Add `'use client'` at the **leaf that actually needs**
  interactivity, state or browser APIs — not at the page, which drags the whole subtree into the client
  bundle and forfeits streaming.
- One component answers one question. A row renders a row; it does not also decide whether a dialog is
  open, and it does not fetch. When a component's props include both data and three `onX` callbacks that
  it merely forwards, the split is in the wrong place.
- Dialogs own their own form state and close over the entity they act on. A single `<Dialogs>` component
  driven by a `mode: 'rename' | 'move' | 'delete'` union grows a conditional for every field and makes
  each dialog's state everyone else's problem.
- Reach for context only for genuinely cross-cutting state (the upload queue, read-only/guest mode). For
  anything else, passing props two levels is cheaper to read than a provider.

## Server state belongs to TanStack Query, exclusively

- **Never fetch in `useEffect`.** It double-fires in development, races on fast navigation, has no cache,
  no dedupe and no retry, and every component reinvents the four render states. `useQuery` provides all
  of it.
- Query keys list every input the query depends on (`['children', nodeId, cursor, sort]`). A key that
  omits an input serves another node's data from cache — the classic "wrong folder contents" bug.
- Never copy server data into `useState`. That creates a second source of truth that goes stale silently.
  Derive during render; if a form needs to edit server data, initialize the form once and treat the form
  as the owner of the draft only.
- Invalidate precisely after mutations (`['children', parentId]`, `['stats', ancestorId]`). Invalidating
  everything hides which data a mutation actually affects, and that knowledge is exactly what a reviewer
  is checking.
- Keep `refetchOnWindowFocus` on for shared/guest surfaces. It is what turns "the owner revoked access
  while you were away" into a clear screen instead of a frozen UI.

## Every data surface renders four states

Loading, empty, error, and success — explicitly, as separate branches or components. A chain like
`{data && <List/>}` silently renders nothing for the other three, which reads as a broken app.

- **Empty** is a product state, not a blank area: distinguish "no items yet" from "no search results"
  from "this folder was emptied", each with the action the user can take.
- **Error** distinguishes retryable (network, 5xx → retry button) from terminal (404/410 after deletion or
  revocation → an explanatory screen, no retry loop). Retrying a 404 forever is a worse experience than
  a plain message.
- Skeletons should occupy the real layout so content does not jump when it arrives. Layout shift reads as
  low quality even when everything works.

## Mutations

- Optimistic updates use the full triad: snapshot in `onMutate`, restore in `onError`, reconcile in
  `onSettled`. An optimistic update without rollback shows the user a change that did not happen — worse
  than a spinner.
- Renames and moves are optimistic (instant, cheap to roll back). Deletes are not: confirm first, then
  show the real result. Optimistically removing a subtree that the server then refuses is alarming.
- Disable the submit control while a mutation is in flight and keep the entered value on failure. Losing
  a typed name on a 409 is the single most annoying failure in a file manager.
- Map server error codes to UI intent in one place (`errorCode → { title, action }`), so a new backend
  code cannot silently render as "Something went wrong".

## Lists

- `key` is the entity id. Never the array index — with index keys, deleting a row makes React reuse the
  wrong DOM node and any local row state jumps to a neighbour.
- Virtualize past a few hundred rows, and make sure row height is known or measured; otherwise scrolling
  a large folder janks.
- Sort and filter on the server, since the server is paginated. Client-side sorting of one page produces
  a list that is sorted only locally — subtly wrong and hard to explain.

## Uploads

- Progress requires `XMLHttpRequest` (`xhr.upload.onprogress`); `fetch` reports no upload progress.
- The queue lives in a provider above the router outlet, so navigating between folders does not cancel
  in-flight uploads. A queue owned by the page is destroyed by the first navigation.
- Cap concurrency (about 3) and expose per-item cancel and retry. `xhr.abort()` for cancel; a retry
  re-requests a fresh presigned URL rather than reusing a possibly expired one.
- Validate size and type on the client for fast feedback, and treat the server's answer as authoritative —
  the client check is UX, not enforcement.

## Forms

`react-hook-form` + `zodResolver`, with the zod schema shaped like the request DTO. Map field-level server
errors back onto fields via `setError` so validation feels like one system rather than two. A form that
shows server errors only as a toast forces the user to guess which field was wrong.

## Keyboard and focus (cheap, and very visible in review)

- Dialogs: focus the first field on open, trap focus, close on Escape, restore focus to the trigger on
  close. Radix/shadcn primitives do this — do not hand-roll a modal and lose it.
- The file list is a table of interactive rows: Enter opens, ArrowUp/Down moves, and the focus ring stays
  visible. Never remove focus outlines to make a design cleaner.
- Every icon-only button gets an accessible label. A toolbar of unlabelled icons is unusable with a
  screen reader and ambiguous with a mouse.

## Performance, in the right order

Correctness first, then measure, then optimize. `memo`/`useMemo`/`useCallback` sprinkled preemptively adds
dependency arrays that go stale and hide bugs. Do reach for them when a row component re-renders on every
parent keystroke — but confirm with the profiler first, and say in the PR what you measured.

## Review checklist

1. `'use client'` sits at the smallest component that needs it.
2. No `useEffect` fetch; no server data mirrored into `useState`.
3. Query keys include every input; invalidation names the affected keys.
4. All four render states exist for each data surface, with distinct empty variants.
5. Terminal errors (404/410) stop retrying and explain themselves.
6. Optimistic mutations roll back; inputs survive failures.
7. Row `key` is an entity id; long lists virtualized.
8. Dialogs: focus trap, Escape, focus restore. Icon buttons labelled.
9. Upload queue survives navigation; cancel and retry work.
10. Nothing in the UI promises a feature that does not exist.
