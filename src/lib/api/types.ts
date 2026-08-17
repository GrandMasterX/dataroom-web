import type { components, paths } from './schema';

/**
 * Names for the shapes the API returns, derived from its OpenAPI document rather than
 * written by hand.
 *
 * The API lives in another repository, so hand-written duplicates here would drift the first
 * time a field changes and nothing would notice until runtime. `pnpm api:sync` regenerates
 * `schema.d.ts`, and a mismatch becomes a compile error instead.
 */
export type Node = components['schemas']['NodeDto'];
export type NodeDetail = components['schemas']['NodeDetailDto'];
export type Breadcrumb = components['schemas']['BreadcrumbDto'];
export type Capabilities = components['schemas']['CapabilitiesDto'];
export type ChildrenPage = components['schemas']['ChildrenPageDto'];
export type SubtreeStats = components['schemas']['SubtreeStatsDto'];
export type SearchHit = components['schemas']['SearchHitDto'];
export type DataRoom = components['schemas']['DataRoomDto'];
export type User = components['schemas']['UserDto'];

export type PresignBatchResult = components['schemas']['PresignBatchResultDto'];
export type PresignedItem = components['schemas']['PresignedItemDto'];
export type UploadConflict = components['schemas']['UploadConflictDto'];
export type UploadResult = components['schemas']['UploadResultDto'];
export type PreviewUrl = components['schemas']['PreviewUrlDto'];
export type FileVersion = components['schemas']['FileVersionDto'];

export type NodeShares = components['schemas']['NodeSharesDto'];
export type ShareLink = components['schemas']['ShareLinkDto'];
export type ShareGrant = components['schemas']['ShareGrantDto'];
export type SharedLinkContext = components['schemas']['SharedLinkContextDto'];
export type SharedWithMeItem = components['schemas']['SharedWithMeItemDto'];

export type ConflictStrategy = 'fail' | 'rename' | 'newVersion';

/** Kept as a compile-time assertion that the generated document still has the paths used here. */
export type KnownPaths = keyof paths;
