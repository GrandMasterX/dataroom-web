import { Explorer } from '@/components/explorer/explorer';

export const metadata = { title: 'Shared with you — Data Room' };

/**
 * A folder inside a shared subtree. Anything outside it answers 404 — the guest boundary is
 * enforced by the API, so a hand-edited URL gains nothing.
 */
export default async function SharedFolderPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  return <Explorer nodeId={nodeId} />;
}
