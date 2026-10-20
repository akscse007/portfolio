import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/server/repos/public';
import { siteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/** Only PUBLISHED content is listed. Admin, API and drafts are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    '/',
    '/about',
    '/work',
    '/research',
    '/achievements',
    '/blog',
    '/demos',
    '/playground',
    '/contact',
    '/resume',
    '/privacy',
    '/terms',
  ];
  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const { projects, achievements, posts, topics } = await getSitemapEntries();
    dynamicEntries = [
      ...projects.map((p) => ({
        url: siteUrl(`/work/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
      ...achievements.map((a) => ({
        url: siteUrl(`/achievements/${a.slug}`),
        lastModified: a.updatedAt,
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      })),
      ...posts.map((p) => ({
        url: siteUrl(`/blog/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
      ...topics.map((t) => ({
        url: siteUrl(`/topics/${t.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
    ];
  } catch (err) {
    console.error('[sitemap] database unavailable', err);
  }
  return [
    ...staticRoutes.map((r) => ({
      url: siteUrl(r),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: r === '/' ? 1 : 0.7,
    })),
    ...dynamicEntries,
  ];
}
