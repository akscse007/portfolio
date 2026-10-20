import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getPosts, getTopics } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PageHero, SectionHeader, EmptyState } from '@/components/ui/primitives';
import { BlogIndex } from '@/components/blog/BlogIndex';
import { DifficultyMeter } from '@/components/blog/PostRow';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Notes — Mathematics, CS & ML for juniors',
  description:
    'First-principles notes on linear algebra, algorithms, databases, machine learning, RAG and time-series forecasting.',
  path: '/blog',
});

export default async function BlogPage() {
  const [posts, topics] = await Promise.all([getPosts(), getTopics()]);
  const featured = posts.filter((p) => p.featured).slice(0, 3);
  const groups = topics.reduce<Record<string, typeof topics>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <>
      <PageHero
        index="04"
        label="Notes for juniors"
        title={
          <>
            Learn it{' '}
            <span className="font-serif font-normal normal-case italic text-accent">properly</span>
          </>
        }
        intro="Mathematics, computer science and machine learning explained from first principles — with equations, runnable code and diagrams."
      >
        <p className="mt-6 font-mono text-mono-sm uppercase text-muted">
          <a href="/feed.xml" className="link-underline">
            RSS
          </a>{' '}
          ·{' '}
          <a href="/atom.xml" className="link-underline">
            Atom
          </a>
        </p>
      </PageHero>

      {posts.length === 0 ? (
        <section className="container-page pb-section">
          <EmptyState title="The first notes are in review">
            Articles are published once they have been checked.
          </EmptyState>
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <section
              aria-labelledby="featured-h"
              className="container-page border-t border-line py-16"
            >
              <h2 id="featured-h" className="section-index mb-8">
                Featured
              </h2>
              <ul className="grid gap-10 md:grid-cols-3">
                {featured.map((p, i) => (
                  <li key={p.slug} className="group relative border-t-2 border-fg pt-5">
                    <p className="font-mono text-mono-xs text-accent">0{i + 1}</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold leading-tight">
                      <Link
                        href={`/blog/${p.slug}`}
                        className="after:absolute after:inset-0 group-hover:text-accent"
                      >
                        {p.title}
                      </Link>
                    </h3>
                    <p className="mt-3 line-clamp-3 text-fg/75">{p.excerpt}</p>
                    <p className="label mt-4 flex flex-wrap gap-x-4 gap-y-1">
                      <DifficultyMeter level={p.difficulty} />
                      <span>{p.readingMinutes} min</span>
                      <span>{formatDate(p.publishedAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="all-h" className="container-page border-t border-line py-16">
            <h2 id="all-h" className="section-index mb-8">
              All notes
            </h2>
            <Suspense fallback={<div className="skeleton h-96 rounded-sm" />}>
              <BlogIndex posts={posts} topics={topics.filter((t) => t.postCount > 0)} />
            </Suspense>
          </section>
        </>
      )}

      <section
        aria-labelledby="topics-h"
        className="container-page border-t border-line py-section"
      >
        <SectionHeader
          label="Curriculum"
          id="topics-h"
          title="Topics"
          intro="The map of subjects these notes will cover. Topics with published notes are linked."
        />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group}>
              <h3 className="label-accent mb-4">{group}</h3>
              <ul className="space-y-2">
                {list.map((t) => (
                  <li key={t.slug}>
                    {t.postCount > 0 ? (
                      <Link
                        href={`/topics/${t.slug}`}
                        className="group flex items-baseline justify-between gap-2 hover:text-accent"
                      >
                        <span>{t.name}</span>
                        <span className="font-mono text-mono-xs text-muted">{t.postCount}</span>
                      </Link>
                    ) : (
                      <span className="text-muted">{t.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
