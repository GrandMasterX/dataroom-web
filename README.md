# Data Room — web

The interface: browsing folders, uploading documents, viewing them, and sharing them.

The design decisions, the data model and the "how it scales" notes live in the
**[dataroom-api README](https://github.com/GrandMasterX/dataroom-api)**, which is the entry
point for this project. This file covers what is specific to the frontend.

| Repository | Contents |
| --- | --- |
| [dataroom-api](https://github.com/GrandMasterX/dataroom-api) | NestJS, PostgreSQL, S3 — and the main README |
| **dataroom-web** (this one) | Next.js 16, React 19, Tailwind 4, TanStack Query |
| [dataroom-infra](https://github.com/GrandMasterX/dataroom-infra) | Terraform |

## Running it

The API must be running first (see its README — one `docker compose up -d` and two commands).

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
