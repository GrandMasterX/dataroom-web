/**
 * Every cache key in one place.
 *
 * Keys decide what a mutation invalidates, and a key spelled slightly differently in two
 * files means a stale listing that nobody can reproduce. Building them from one factory
 * makes "what does this affect" a question the compiler helps answer.
 */
export const queryKeys = {
  session: ['session'] as const,
  dataRooms: ['data-rooms'] as const,
  sharedWithMe: ['shared-with-me'] as const,

  node: (nodeId: string) => ['node', nodeId] as const,
  // The cursor is deliberately absent: pages belong to one infinite query, so they share a
  // key and invalidate together. With the cursor in the key each page would be its own cache
  // entry, and after a rename reorders items the merged list can show one node twice.
  children: (nodeId: string, type?: 'FOLDER' | 'FILE') => ['children', nodeId, { type }] as const,
  stats: (nodeId: string) => ['stats', nodeId] as const,

  shares: (nodeId: string) => ['shares', nodeId] as const,
  previewUrl: (nodeId: string) => ['preview-url', nodeId] as const,
  versions: (nodeId: string) => ['versions', nodeId] as const,
  sharedLink: (token: string) => ['shared-link', token] as const,
  search: (dataRoomId: string, query: string) => ['search', dataRoomId, query] as const,
} as const;
