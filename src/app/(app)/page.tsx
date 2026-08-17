import { DataRoomList } from '@/components/rooms/data-room-list';
import { SharedWithMeList } from '@/components/rooms/shared-with-me-list';

export const metadata = { title: 'Data rooms' };

export default function HomePage() {
  return (
    <div className="space-y-10">
      <DataRoomList />
      <SharedWithMeList />
    </div>
  );
}
