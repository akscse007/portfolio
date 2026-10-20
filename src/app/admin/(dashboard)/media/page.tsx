import { AdminHeader } from '@/components/admin/fields';
import { MediaLibrary } from './MediaLibrary';

export const metadata = { title: 'Media' };

export default function AdminMediaPage() {
  return (
    <div>
      <AdminHeader
        title="Media library"
        description="All uploads are private by default. Files used by published content become public automatically; files used only by drafts or unapproved certificates stay private."
      />
      <MediaLibrary />
    </div>
  );
}
