import { ogImage, OG_SIZE } from '@/lib/og';
import { getAchievement } from '@/server/repos/public';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Achievement preview';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getAchievement(slug);
  return ogImage({
    kicker: a ? `Proof of work · ${a.categoryLabel}` : 'Proof of work',
    title: a?.title ?? 'Achievements',
    footer: a?.issuer,
  });
}
