import { ogImage, OG_SIZE } from '@/lib/og';
import { getProject } from '@/server/repos/public';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Project case study preview';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProject(slug);
  return ogImage({
    kicker: p ? `Case study · ${p.category}` : 'Case study',
    title: p?.title ?? 'Project laboratory',
    footer: p?.subtitle || undefined,
  });
}
