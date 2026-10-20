import Link from 'next/link';
import type { RenderedMarkdown } from '@/lib/markdown';
import { Prose, Breadcrumbs } from '@/components/ui/primitives';
import { TableOfContents } from './TableOfContents';
import { ArticleEnhancer } from './ArticleEnhancer';
import { DifficultyMeter } from './PostRow';
import { formatDate } from '@/lib/utils';

export type ArticleMeta = {
  title: string;
  excerpt: string;
  difficulty: string;
  readingMinutes: number;
  publishedAt: string | null;
  updatedAt: string;
  topic: { name: string; slug: string } | null;
  series: { title: string; slug: string; order: number | null } | null;
  tags: { name: string; slug: string }[];
};

/** Long-form article layout shared by the public post page and the admin preview. */
export function ArticleView({
  meta,
  rendered,
  draftBanner,
  aside,
  footer,
}: {
  meta: ArticleMeta;
  rendered: RenderedMarkdown;
  draftBanner?: React.ReactNode;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article id="article">
      {draftBanner}
      <header className="container-page pb-12 pt-[calc(var(--header-h)+3rem)] md:pt-[calc(var(--header-h)+5rem)]">
        <Breadcrumbs
          items={[
            { label: 'Notes', href: '/blog' },
            ...(meta.topic ? [{ label: meta.topic.name, href: `/topics/${meta.topic.slug}` }] : []),
            { label: meta.title },
          ]}
        />
        {meta.series && (
          <p className="annot mt-8">
            Series · {meta.series.title}
            {meta.series.order ? ` · Part ${meta.series.order}` : ''}
          </p>
        )}
        <h1
          className="mt-4 max-w-5xl font-display text-display-md font-bold"
          style={{ fontStretch: '78%' }}
        >
          {meta.title}
        </h1>
        {meta.excerpt && (
          <p className="mt-6 max-w-3xl font-serif text-2xl italic leading-snug text-fg/85">
            {meta.excerpt}
          </p>
        )}
        <div className="label mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5">
          <span>{meta.publishedAt ? formatDate(meta.publishedAt) : 'Unpublished draft'}</span>
          <span>{meta.readingMinutes} min read</span>
          <DifficultyMeter level={meta.difficulty} />
          {meta.tags.length > 0 && (
            <span className="normal-case tracking-normal">
              {meta.tags.map((t) => `#${t.name}`).join('  ')}
            </span>
          )}
        </div>
      </header>

      <div className="container-page grid gap-12 lg:grid-cols-12">
        <aside className="lg:order-2 lg:col-span-3">
          <div className="space-y-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <TableOfContents items={rendered.toc} />
            {aside}
          </div>
        </aside>
        <div
          id="article-body"
          data-progress-target
          className="min-w-0 lg:order-1 lg:col-span-8 xl:col-span-7"
        >
          <Prose html={rendered.html} />
          <ArticleEnhancer rootId="article-body" hasMermaid={rendered.hasMermaid} />
          {footer}
        </div>
      </div>
    </article>
  );
}

export function SeriesNav({
  series,
  posts,
  current,
}: {
  series: { title: string; slug: string };
  posts: { slug: string; title: string; seriesOrder: number | null }[];
  current: string;
}) {
  if (posts.length < 2) return null;
  return (
    <nav aria-label={`Series: ${series.title}`} className="rounded-sm border border-line p-4">
      <p className="label-accent">Series</p>
      <p className="mt-1 font-semibold">{series.title}</p>
      <ol className="mt-3 space-y-1 text-sm">
        {posts.map((p, i) => (
          <li key={p.slug}>
            {p.slug === current ? (
              <span aria-current="page" className="flex gap-2 text-fg">
                <span className="font-mono text-mono-xs text-accent">
                  {String(p.seriesOrder ?? i + 1).padStart(2, '0')}
                </span>
                {p.title}
              </span>
            ) : (
              <Link href={`/blog/${p.slug}`} className="flex gap-2 text-muted hover:text-fg">
                <span className="font-mono text-mono-xs">
                  {String(p.seriesOrder ?? i + 1).padStart(2, '0')}
                </span>
                {p.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
