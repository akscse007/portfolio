import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, getProfile } from '@/server/repos/public';
import { renderMarkdown } from '@/lib/markdown';
import { blogPostingJsonLd, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/utils';
import { JsonLd } from '@/components/ui/primitives';
import { ArticleView, SeriesNav } from '@/components/blog/ArticleView';
import { ShareLinks } from '@/components/blog/ShareLinks';
import { PostRow } from '@/components/blog/PostRow';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: 'Note not found', robots: { index: false } };
  return pageMetadata({
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.excerpt,
    path: `/blog/${p.slug}`,
    image: p.cover?.display ?? `/blog/${p.slug}/opengraph-image`,
    type: 'article',
    publishedTime: p.publishedAt,
    modifiedTime: p.updatedAt,
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [p, profile] = await Promise.all([getPost(slug), getProfile()]);
  if (!p) notFound();
  const rendered = await renderMarkdown(p.content);

  return (
    <>
      <JsonLd
        data={blogPostingJsonLd({
          title: p.title,
          description: p.excerpt,
          slug: p.slug,
          publishedAt: p.publishedAt,
          updatedAt: p.updatedAt,
          author: profile?.name ?? 'Akash Roy',
          image: p.cover?.display,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Notes', path: '/blog' },
          { name: p.title, path: `/blog/${p.slug}` },
        ])}
      />
      <ArticleView
        meta={p}
        rendered={rendered}
        aside={
          <>
            {p.series && <SeriesNav series={p.series} posts={p.seriesPosts} current={p.slug} />}
            {p.attachments.length > 0 && (
              <div>
                <p className="label mb-2">PDF Notes</p>
                <ul className="space-y-2">
                  {p.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.media.original}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2 rounded-sm border border-line p-3 transition-colors hover:border-accent/40"
                      >
                        <span className="mt-0.5 shrink-0 rounded-xs bg-surface px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-accent">
                          PDF
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium group-hover:text-accent">
                            {a.title}
                          </span>
                          {a.description && (
                            <span className="mt-0.5 block text-xs text-muted">{a.description}</span>
                          )}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(p.projects.length > 0 || p.achievements.length > 0) && (
              <div>
                <p className="label mb-2">Related</p>
                <ul className="space-y-1 text-sm">
                  {p.projects.map((x) => (
                    <li key={x.slug}>
                      <Link href={`/work/${x.slug}`} className="text-muted hover:text-accent">
                        Project · {x.title}
                      </Link>
                    </li>
                  ))}
                  {p.achievements.map((x) => (
                    <li key={x.slug}>
                      <Link
                        href={`/achievements/${x.slug}`}
                        className="text-muted hover:text-accent"
                      >
                        Achievement · {x.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        }
        footer={
          <div className="mt-16 space-y-12">
            <ShareLinks url={siteUrl(`/blog/${p.slug}`)} title={p.title} />
            <nav aria-label="More notes" className="grid border-y border-line sm:grid-cols-2">
              <div className="py-6 sm:border-r sm:border-line sm:pr-6">
                {p.older && (
                  <Link href={`/blog/${p.older.slug}`} className="group block">
                    <span className="label">← Previous note</span>
                    <span className="mt-2 block font-display text-xl font-semibold group-hover:text-accent">
                      {p.older.title}
                    </span>
                  </Link>
                )}
              </div>
              <div className="border-t border-line py-6 text-right sm:border-t-0 sm:pl-6">
                {p.newer && (
                  <Link href={`/blog/${p.newer.slug}`} className="group block">
                    <span className="label">Next note →</span>
                    <span className="mt-2 block font-display text-xl font-semibold group-hover:text-accent">
                      {p.newer.title}
                    </span>
                  </Link>
                )}
              </div>
            </nav>
            {p.related.length > 0 && (
              <section aria-labelledby="related-h">
                <h2 id="related-h" className="label mb-2">
                  Related notes
                </h2>
                <div className="border-t border-line">
                  {p.related.map((r) => (
                    <PostRow key={r.slug} post={r} />
                  ))}
                </div>
              </section>
            )}
          </div>
        }
      />
    </>
  );
}
