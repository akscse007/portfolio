import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { PostEditor } from '../PostEditor';
import { postEditorOptions } from '../editor-data';

export const metadata = { title: 'Edit post' };

function toLocalInput(d: Date | null) {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, opts] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        projects: { select: { projectId: true } },
        cover: true,
        attachments: {
          orderBy: { order: 'asc' },
          include: { media: { select: { id: true, kind: true, alt: true, originalName: true, mimeType: true } } },
        },
      },
    }),
    postEditorOptions(id),
  ]);
  if (!p) notFound();
  return (
    <div>
      <AdminHeader
        title={p.title}
        description={
          <span className="inline-flex items-center gap-2">
            Editing post <StatusPill status={p.status} />
          </span>
        }
      />
      <PostEditor
        {...opts}
        initial={{
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          difficulty: p.difficulty,
          topicId: p.topicId ?? '',
          seriesId: p.seriesId ?? '',
          seriesOrder: p.seriesOrder ? String(p.seriesOrder) : '',
          cover: p.cover,
          status: p.status,
          featured: p.featured,
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
          publishedAt: toLocalInput(p.publishedAt),
          tags: p.tags.map((t) => t.tag.name),
          projectIds: p.projects.map((x) => x.projectId),
          attachments: p.attachments.map((a) => ({
            mediaId: a.mediaId,
            title: a.title,
            description: a.description,
            order: a.order,
            media: a.media,
          })),
        }}
      />
    </div>
  );
}
