import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { VideosManager } from './VideosManager';

export const metadata = { title: 'Videos' };

export default async function AdminVideosPage() {
  const [videos, projects] = await Promise.all([
    prisma.video.findMany({
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      include: { tags: { include: { tag: true } }, file: true, poster: true, captions: true },
    }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  return (
    <div>
      <AdminHeader
        title="Videos"
        description="Demo recordings for /demos. Use real recordings only — YouTube/Vimeo links or uploaded MP4s. Durations are optional; never estimate them."
      />
      <VideosManager
        projects={projects}
        initial={videos.map((v) => ({
          id: v.id,
          slug: v.slug,
          title: v.title,
          description: v.description,
          category: v.category,
          provider: v.provider,
          externalUrl:
            v.provider === 'YOUTUBE' && v.externalId
              ? `https://www.youtube.com/watch?v=${v.externalId}`
              : v.provider === 'VIMEO' && v.externalId
                ? `https://vimeo.com/${v.externalId}`
                : '',
          file: v.file,
          poster: v.poster,
          captions: v.captions,
          durationSeconds: v.durationSeconds ? String(v.durationSeconds) : '',
          transcript: v.transcript ?? '',
          projectId: v.projectId ?? '',
          status: v.status,
          featured: v.featured,
          order: v.order,
          tags: v.tags.map((t) => t.tag.name),
        }))}
      />
    </div>
  );
}
