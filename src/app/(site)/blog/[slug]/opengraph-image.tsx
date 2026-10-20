import { ogImage, OG_SIZE } from '@/lib/og';
import { getPost } from '@/server/repos/public';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Article preview';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);
  return ogImage({
    kicker: p?.topic?.name ? `Notes · ${p.topic.name}` : 'Notes',
    title: p?.title ?? 'Notes for juniors',
    footer: p ? `${p.readingMinutes} min read` : undefined,
  });
}
