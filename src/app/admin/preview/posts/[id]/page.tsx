import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { renderMarkdown } from '@/lib/markdown';
import { ArticleView } from '@/components/blog/ArticleView';
import { PreviewBanner } from '@/components/admin/PreviewBanner';

export default async function PostPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.post.findUnique({
    where: { id },
    include: { topic: true, series: true, tags: { include: { tag: true } } },
  });
  if (!p) notFound();
  const rendered = await renderMarkdown(p.content);
  return (
    <>
      <ArticleView
        meta={{
          title: p.title,
          excerpt: p.excerpt,
          difficulty: p.difficulty,
          readingMinutes: p.readingMinutes,
          publishedAt: p.publishedAt?.toISOString() ?? null,
          updatedAt: p.updatedAt.toISOString(),
          topic: p.topic ? { name: p.topic.name, slug: p.topic.slug } : null,
          series: p.series
            ? { title: p.series.title, slug: p.series.slug, order: p.seriesOrder }
            : null,
          tags: p.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
        }}
        rendered={rendered}
      />
      <div className="h-24" />
      <PreviewBanner status={p.status} editHref={`/admin/posts/${p.id}`} />
    </>
  );
}
