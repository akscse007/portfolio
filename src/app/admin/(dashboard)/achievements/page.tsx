import Link from 'next/link';
import { listAchievementsAdmin } from '@/server/services/achievements';
import { AdminHeader } from '@/components/admin/fields';
import { AchievementsManager } from './AchievementsManager';

export const metadata = { title: 'Achievements' };

export default async function AdminAchievementsPage() {
  const rows = await listAchievementsAdmin();
  return (
    <div>
      <AdminHeader
        title="Achievements"
        description="Certificates, awards and milestones. Records stay private until published; certificate images become public only after you approve the preview."
        actions={
          <Link href="/admin/achievements/new" className="btn-primary btn-sm">
            New achievement
          </Link>
        }
      />
      <AchievementsManager
        initial={rows.map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          issuer: a.issuer,
          category: a.category,
          status: a.status,
          featured: a.featured,
          order: a.order,
          previewApproved: a.previewApproved,
          documentPublic: a.documentPublic,
          dateLabel: a.dateLabel,
          issueDate: a.issueDate?.toISOString() ?? null,
          assetCount: a.assets.length,
          thumbId:
            a.assets.find((x) => x.role === 'PREVIEW')?.media.id ??
            a.assets.find((x) => x.media.kind === 'IMAGE')?.media.id ??
            null,
        }))}
      />
    </div>
  );
}
