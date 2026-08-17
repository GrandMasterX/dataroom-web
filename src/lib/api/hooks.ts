'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type {
  ChildrenPage,
  ConflictStrategy,
  DataRoom,
  FileVersion,
  Node,
  NodeDetail,
  NodeShares,
  PresignBatchResult,
  PreviewUrl,
  ShareGrant,
  ShareLink,
  SharedLinkContext,
  SearchHit,
  SharedWithMeItem,
  SubtreeStats,
  UploadResult,
  User,
} from './types';

/**
 * Server state lives here and nowhere else.
 *
 * No component fetches in an effect: that pattern double-fires in development, races on fast
 * navigation, and leaves every caller to reinvent loading, empty, error and retry. These
 * hooks provide all of it once.
 */

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => api.get<{ user: User | null }>('auth/session'),
    staleTime: 60_000,
  });
}

export function useDataRooms() {
  return useQuery({
    queryKey: queryKeys.dataRooms,
    queryFn: () => api.get<DataRoom[]>('data-rooms'),
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: queryKeys.sharedWithMe,
    queryFn: () => api.get<SharedWithMeItem[]>('shared-with-me'),
  });
}

export function useNode(nodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.node(nodeId ?? ''),
    queryFn: () => api.get<NodeDetail>(`nodes/${nodeId}`),
    enabled: Boolean(nodeId),
  });
}

export function useChildren(nodeId: string | undefined, type?: 'FOLDER' | 'FILE') {
  return useInfiniteQuery({
    queryKey: queryKeys.children(nodeId ?? '', type),
    enabled: Boolean(nodeId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);
      if (type) params.set('type', type);
      return api.get<ChildrenPage>(`nodes/${nodeId}/children?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Refetching every loaded page on each window focus would turn a long folder into dozens
    // of requests; the first page is enough to notice that something changed.
    maxPages: 1,
  });
}

export function useStats(nodeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stats(nodeId ?? ''),
    queryFn: () => api.get<SubtreeStats>(`nodes/${nodeId}/stats`),
    enabled: Boolean(nodeId) && enabled,
  });
}

export function usePreviewUrl(nodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.previewUrl(nodeId ?? ''),
    queryFn: () => api.get<PreviewUrl>(`files/${nodeId}/preview-url`),
    enabled: Boolean(nodeId),
    // The URL is signed and short-lived. Refetching on focus would swap the viewer's src and
    // reload the document, losing the reader's place; instead it refreshes shortly before it
    // expires.
    refetchOnWindowFocus: false,
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
}

export function useVersions(nodeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.versions(nodeId ?? ''),
    queryFn: () => api.get<FileVersion[]>(`files/${nodeId}/versions`),
    enabled: Boolean(nodeId) && enabled,
  });
}

export function useNodeShares(nodeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.shares(nodeId ?? ''),
    queryFn: () => api.get<NodeShares>(`nodes/${nodeId}/shares`),
    enabled: Boolean(nodeId) && enabled,
  });
}

export function useSearch(nodeId: string | undefined, query: string) {
  return useQuery({
    queryKey: queryKeys.search(nodeId ?? '', query),
    queryFn: () => api.get<SearchHit[]>(`nodes/${nodeId}/search?q=${encodeURIComponent(query)}`),
    // Below three characters the server rejects the query, so asking would only produce an
    // error state for something the user has not finished typing.
    enabled: Boolean(nodeId) && query.length >= 3,
    // Results are cheap to refetch and go stale as soon as anything is renamed.
    staleTime: 5_000,
  });
}

export function useSharedLink(token: string) {
  return useQuery({
    queryKey: queryKeys.sharedLink(token),
    queryFn: () => api.get<SharedLinkContext>(`shared/${token}`),
    retry: false,
  });
}

/**
 * Invalidates what a change to a folder actually affects: its listing, its totals, and the
 * node itself. Named rather than inlined so every mutation states the same thing — a blanket
 * "invalidate everything" would hide which data a mutation touches.
 */
function useFolderInvalidation() {
  const queryClient = useQueryClient();
  return (parentId: string | null | undefined, nodeId?: string) => {
    if (parentId) {
      void queryClient.invalidateQueries({ queryKey: ['children', parentId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats(parentId) });
    }
    if (nodeId) void queryClient.invalidateQueries({ queryKey: queryKeys.node(nodeId) });
  };
}

export function useCreateDataRoom(): UseMutationResult<DataRoom, Error, { name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<DataRoom>('data-rooms', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms }),
  });
}

export function useDeleteDataRoom(): UseMutationResult<unknown, Error, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.delete(`data-rooms/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms }),
  });
}

export function useCreateFolder(): UseMutationResult<
  Node,
  Error,
  { parentId: string; name: string; onConflict?: ConflictStrategy }
> {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: (input) => api.post<Node>('nodes/folders', input),
    onSuccess: (_node, input) => invalidate(input.parentId),
  });
}

export function useRenameNode(): UseMutationResult<
  Node,
  Error,
  { nodeId: string; parentId: string | null; name: string; onConflict?: ConflictStrategy }
> {
  const queryClient = useQueryClient();
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: ({ nodeId, name, onConflict }) =>
      api.patch<Node>(`nodes/${nodeId}`, { name, onConflict }),
    onSuccess: (_node, input) => {
      invalidate(input.parentId, input.nodeId);
      // Renaming a room's root renames the room, so the rooms list is affected too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
    },
  });
}

export function useMoveNode(): UseMutationResult<
  Node,
  Error,
  {
    nodeId: string;
    fromParentId: string | null;
    targetParentId: string;
    onConflict?: ConflictStrategy;
  }
> {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: ({ nodeId, targetParentId, onConflict }) =>
      api.post<Node>(`nodes/${nodeId}/move`, { targetParentId, onConflict }),
    onSuccess: (_node, input) => {
      invalidate(input.fromParentId, input.nodeId);
      invalidate(input.targetParentId);
    },
  });
}

export function useDeleteNode(): UseMutationResult<
  { deletedItems: number },
  Error,
  { nodeId: string; parentId: string | null }
> {
  const invalidate = useFolderInvalidation();
  return useMutation({
    mutationFn: ({ nodeId }) => api.delete<{ deletedItems: number }>(`nodes/${nodeId}`),
    onSuccess: (_result, input) => invalidate(input.parentId, input.nodeId),
  });
}

export function useCreateShareLink(): UseMutationResult<ShareLink, Error, { nodeId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId }) => api.post<ShareLink>(`nodes/${nodeId}/shares/link`, {}),
    onSuccess: (_link, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shares(input.nodeId) }),
  });
}

export function useRevokeShareLink(): UseMutationResult<
  unknown,
  Error,
  { linkId: string; nodeId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId }) => api.delete(`shares/links/${linkId}`),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shares(input.nodeId) }),
  });
}

export function useGrantAccess(): UseMutationResult<
  ShareGrant,
  Error,
  { nodeId: string; email: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, email }) =>
      api.post<ShareGrant>(`nodes/${nodeId}/shares/grants`, { email }),
    onSuccess: (_grant, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shares(input.nodeId) }),
  });
}

export function useRevokeGrant(): UseMutationResult<
  unknown,
  Error,
  { grantId: string; nodeId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId }) => api.delete(`shares/grants/${grantId}`),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shares(input.nodeId) }),
  });
}

/** Uploads are driven by the queue rather than by a hook: see lib/uploads. */
export const uploadApi = {
  presign: (input: {
    parentId: string;
    items: { fileName: string; mimeType: string; sizeBytes: number }[];
  }) => api.post<PresignBatchResult>('uploads/presign', input),
  complete: (input: { intentId: string; onConflict?: ConflictStrategy }) =>
    api.post<UploadResult>('uploads/complete', input),
};
