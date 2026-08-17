import { FileViewer } from '@/components/viewer/file-viewer';

export const metadata = { title: 'Shared with you — Data Room' };

export default async function SharedFilePage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  return <FileViewer nodeId={nodeId} />;
}
