import { OwnerLinks } from '@/components/explorer/node-links';
import { FileViewer } from '@/components/viewer/file-viewer';

export const metadata = { title: 'Document — Data Room' };

export default async function FilePage({
  params,
}: {
  params: Promise<{ roomId: string; nodeId: string }>;
}) {
  const { roomId, nodeId } = await params;
  return (
    <OwnerLinks roomId={roomId}>
      <FileViewer nodeId={nodeId} />
    </OwnerLinks>
  );
}
