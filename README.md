# Data Room — web

The interface to a virtual data room: browsing folders, uploading documents with real
progress, viewing them, and sharing a room, a folder or a single file read-only.

Next.js 16 (App Router), React 19, Tailwind 4 and TanStack Query, plus a small
backend-for-frontend proxy that keeps sessions in first-party httpOnly cookies. This README
covers the frontend; the data model and the access rules it renders belong to the API and are
documented there.

Related repositories, each documented on its own: the API in
[dataroom-api](https://github.com/GrandMasterX/dataroom-api) and the AWS infrastructure in
[dataroom-infra](https://github.com/GrandMasterX/dataroom-infra).

## Live instance

**https://dataroom-web-rosy.vercel.app**

Two demo accounts, password `Password123!` for both; the sign-in page also has a **Use the
demo account** button, so nothing needs typing.

| Account | What it shows |
| --- | --- |
| `owner@demo.dataroom` | Owns a room: the whole tree, uploads, sharing controls, version history. |
| `viewer@demo.dataroom` | The receiving end of a per-person grant — read-only, one folder. |

A [public link](https://dataroom-web-rosy.vercel.app/s/5907cbe5bd994de08fba2e5d0cdd6dc4)
needs no account at all and is the fastest thing to try.

The first request after the database has been idle takes about half a second longer than a
warm one — free-tier compute waking up, not the code.

## Running it

The API has to be running first: clone
[dataroom-api](https://github.com/GrandMasterX/dataroom-api) and follow its README, which
brings up PostgreSQL and MinIO in Docker and seeds the demo data.

```bash
pnpm install
cp .env.example .env.local    # API_URL, server-side only
pnpm dev                      # http://localhost:3000
```

`pnpm api:sync` regenerates the typed API contract from a running API; `pnpm api:types` does
the same from the committed `openapi.json` without touching the network.

## How this app talks to the API

The browser never calls the API directly. Every request goes through `/api/…` in this app,
which attaches the session and forwards it. That keeps tokens in **first-party httpOnly
cookies**: no cross-site cookie handling, and no credential a script on the page could read.
The API itself stays publicly reachable with CORS configured — this is a
backend-for-frontend, not a hiding place.

Two behaviours in that proxy exist because of specific failures:

- **Refreshes are single-flighted.** A tab waking up refetches several queries at once; all
  would refresh with the same token, and the API's reuse detection would end the session for
  using the app normally.
- **An expired access cookie refreshes before the request, not after a 401.** Read endpoints
  answer 404 rather than 403 so they never confirm a resource exists, which means an expired
  session on a read looks like "not found" — the user would be told the document was gone when
  their session had merely lapsed.

## Conventions worth knowing

**Types are generated, never written.** `src/lib/api/schema.d.ts` comes from the API's OpenAPI
document. Because the API is a separate repository, a hand-written duplicate would drift and
nothing would notice until runtime.

**Server state lives in TanStack Query.** Nothing fetches in an effect: that pattern
double-fires in development, races on navigation, and makes every caller reinvent loading,
empty, error and retry.

**Four render states, always.** Loading, empty, error and gone are separate branches rather
than a chain of `&&`, which renders nothing for three of them. Terminal errors — a deleted
item, a revoked share — stop retrying and explain themselves instead of spinning.

**The interface renders from capabilities the server computes**, not from a role it re-derives.
A guest is never shown a control that would be refused, and the permission rule stays in one
place.

**Uploads are a plain class, not hooks.** They are imperative and outlive renders, so
`UploadEngine` owns the queue and React subscribes to its snapshots. Progress comes from
`XMLHttpRequest`, because `fetch` cannot report what it is sending. The queue is mounted above
the router outlet so navigating between folders does not cancel a transfer.

**Name collisions are answered before bytes move.** The API reports them when signing, so the
user chooses *keep both*, *add as a new version*, or *skip* first — and answering completes the
same upload rather than repeating it.

## Routes

```
/login, /register
/                                  data rooms and what has been shared with you
/d/[roomId]/f/[nodeId]             a folder
/d/[roomId]/file/[nodeId]          a document
/s/[token]                         a public link: the shared item, read-only
/s/[token]/f/[nodeId]              a folder inside a shared subtree
/s/[token]/file/[nodeId]           a document inside a shared subtree
/api/…                             the proxy
```

Folders are addressed by id rather than by path, so renaming anything never breaks a link
someone bookmarked or pasted into a chat.

## Response headers

Set in `next.config.ts` for every page this app serves. The API sets its own through helmet,
but those protect API responses; the HTML a person actually browses comes from here.

`Referrer-Policy: no-referrer` is the one that matters most for this product rather than in
general: a document opens from a presigned storage URL that carries its own signature, and a
referrer header is the classic way such a URL ends up in someone else's logs.

There is deliberately no Content-Security-Policy. An honest one here would have to allow
`'unsafe-inline'` for scripts — this app runs no nonce pipeline — and open `frame-src` and
`connect-src` to the storage origin so the viewer and the direct upload keep working. That
policy would block almost nothing while reading as protection. What the viewer's safety
actually rests on is described in `src/components/viewer/pdf-frame.tsx`: only
`application/pdf` is ever served inline, the content type is pinned when the URL is signed
rather than taken from what was stored, and the object comes from an origin that has no
access to this app's cookies.

## Where AI was used

This frontend was built with Claude Code. The useful part of that note is not "AI wrote it"
but what it got wrong and how that was caught — by running it, not by reading it.

The clearest example is in this repository: a `sandbox` attribute on the PDF frame looked
like free hardening and was added on that reasoning alone. Chrome refuses to run its built-in
PDF viewer inside a sandboxed frame, so the entire document view rendered "This page has been
blocked by Chrome" instead. The comment on `PdfFrame` now records why the attribute is absent,
so the same "improvement" does not get reapplied later.

Agent instructions specific to this repository live in `.claude/skills/` — the React and data
fetching rules, and the tree and access invariants the UI has to respect.

