import { SharedEntry } from '@/components/share/shared-entry';

export const metadata = { title: 'Shared with you — Data Room' };

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedEntry token={token} />;
}
