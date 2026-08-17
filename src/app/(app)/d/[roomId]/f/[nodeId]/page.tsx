import { Explorer } from '@/components/explorer/explorer';
import { OwnerLinks } from '@/components/explorer/node-links';

export const metadata = { title: 'Browse — Data Room' };

export default async function FolderPage({
  params,
}: {
  params: Promise<{ roomId: string; nodeId: string }>;
}) {
  // Folders are addressed by id rather than by path: renaming anything must not break a link
  // someone bookmarked or pasted into a chat.
  const { roomId, nodeId } = await params;
  return (
    <OwnerLinks roomId={roomId}>
      <Explorer nodeId={nodeId} />
    </OwnerLinks>
  );
}
