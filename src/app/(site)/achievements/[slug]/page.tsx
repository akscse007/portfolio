import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAchievement } from '@/server/repos/public';
import { renderMarkdown } from '@/lib/markdown';
import { pageMetadata } from '@/lib/seo';
import { AchievementDetailView } from '@/components/achievements/AchievementDetailView';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getAchievement(slug);
  if (!a) return { title: 'Achievement not found', robots: { index: false } };
  return pageMetadata({
    title: a.seoTitle || `${a.title} — ${a.issuer}`,
    description: a.seoDescription || a.summary || `${a.title}, issued by ${a.issuer}.`,
    path: `/achievements/${a.slug}`,
    canonical: a.canonicalUrl,
    image: a.preview?.display ?? `/achievements/${a.slug}/opengraph-image`,
    type: 'article',
    modifiedTime: a.updatedAt,
  });
}

export default async function AchievementPage({ params }: Props) {
  const { slug } = await params;
  const a = await getAchievement(slug);
  if (!a) notFound();
  const [context, learned] = await Promise.all([
    a.context.trim() ? renderMarkdown(a.context) : null,
    a.learned.trim() ? renderMarkdown(a.learned) : null,
  ]);
  return <AchievementDetailView a={a} context={context} learned={learned} />;
}
