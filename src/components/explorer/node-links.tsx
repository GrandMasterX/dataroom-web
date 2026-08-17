'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * How to build a link to a node.
 *
 * The same explorer serves an owner browsing `/d/{room}` and a guest browsing `/s/{token}`,
 * and the two address the very same folders through different routes. Threading that through
 * the table into every row would make each component aware of which of the two it is
 * rendering for; a context lets them keep asking the same question and get the right answer.
 */
export interface NodeLinks {
  folderHref: (nodeId: string) => string;
  fileHref: (nodeId: string) => string;
}

const NodeLinksContext = createContext<NodeLinks | null>(null);

export function OwnerLinks({ roomId, children }: { roomId: string; children: ReactNode }) {
  const links = useMemo<NodeLinks>(
    () => ({
      folderHref: (nodeId) => `/d/${roomId}/f/${nodeId}`,
      fileHref: (nodeId) => `/d/${roomId}/file/${nodeId}`,
    }),
    [roomId],
  );
  return <NodeLinksContext.Provider value={links}>{children}</NodeLinksContext.Provider>;
}

export function GuestLinks({ token, children }: { token: string; children: ReactNode }) {
  const links = useMemo<NodeLinks>(
    () => ({
      folderHref: (nodeId) => `/s/${token}/f/${nodeId}`,
      fileHref: (nodeId) => `/s/${token}/file/${nodeId}`,
    }),
    [token],
  );
  return <NodeLinksContext.Provider value={links}>{children}</NodeLinksContext.Provider>;
}

export function useNodeLinks(): NodeLinks {
  const links = useContext(NodeLinksContext);
  if (!links) throw new Error('useNodeLinks must be used inside OwnerLinks or GuestLinks');
  return links;
}
