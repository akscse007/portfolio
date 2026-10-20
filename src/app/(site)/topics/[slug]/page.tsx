import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTopic } from '@/server/repos/public';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd } from '@/components/ui/primitives';
import { PostRow, DifficultyMeter } from '@/components/blog/PostRow';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTopic(slug);
  if (!t) return { title: 'Topic not found', robots: { index: false } };
  return pageMetadata({
    title: `${t.name} — Notes`,
    description: t.description || `Notes on ${t.name} for juniors.`,
    path: `/topics/${t.slug}`,
    noindex: t.posts.length === 0,
  });
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTopic(slug);
  if (!t) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Notes', path: '/blog' },
          { name: t.name, path: `/topics/${t.slug}` },
        ])}
      />
      <section className="container-page pb-12 pt-[calc(var(--header-h)+3rem)] md:pt-[calc(var(--header-h)+5rem)]">
        <Breadcrumbs items={[{ label: 'Notes', href: '/blog' }, { label: t.name }]} />
        <p className="label-accent mt-8">{t.group}</p>
        <h1
          className="mt-4 font-display text-display-lg font-bold uppercase"
          style={{ fontStretch: '70%' }}
        >
          {t.name}
        </h1>
        {t.description && <p className="mt-6 max-w-2xl text-lg text-fg/80">{t.description}</p>}
      </section>

      {t.series.map((s) => (
        <section
          key={s.slug}
          aria-labelledby={`series-${s.slug}`}
          className="container-page border-t border-line py-14"
        >
          <p className="label-accent">Lesson series</p>
          <h2 id={`series-${s.slug}`} className="mt-2 font-display text-3xl font-semibold">
            {s.title}
          </h2>
          {s.description && <p className="mt-2 max-w-2xl text-muted">{s.description}</p>}
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {s.posts.map((p, i) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex gap-5 rounded-sm border border-line p-5 hover:border-fg"
                >
                  <span
                    className="font-display text-4xl font-bold text-accent"
                    style={{ fontStretch: '70%' }}
                  >
                    {String(p.seriesOrder ?? i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block font-semibold group-hover:text-accent">{p.title}</span>
                    <span className="label mt-2 flex gap-4">
                      <DifficultyMeter level={p.difficulty} />
                      <span>{p.readingMinutes} min</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section aria-labelledby="all-h" className="container-page border-t border-line py-14">
        <h2 id="all-h" className="section-index mb-6">
          All notes in {t.name}
        </h2>
        {t.posts.length ? (
          <div className="border-t border-line">
            {t.posts.map((p) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="No published notes yet">
            This topic is on the curriculum; notes will appear here.
          </EmptyState>
        )}
      </section>
    </>
  );
}
