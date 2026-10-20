import 'server-only';
import { prisma } from '@/lib/db';

export async function postEditorOptions(excludeId?: string) {
  const [topics, series, projects, slugs] = await Promise.all([
    prisma.topic.findMany({
      select: { id: true, name: true },
      orderBy: [{ group: 'asc' }, { order: 'asc' }],
    }),
    prisma.series.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.post.findMany({
      where: excludeId ? { id: { not: excludeId } } : {},
      select: { slug: true },
    }),
  ]);
  return { topics, series, projects, takenSlugs: slugs.map((s) => s.slug) };
}
