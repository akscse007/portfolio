'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PostCard } from '@/server/repos/public';
import { PostRow, DIFFICULTY_LABEL } from './PostRow';
import { EmptyState } from '@/components/ui/primitives';
import { matchesQuery } from '@/lib/utils';

export function BlogIndex({
  posts,
  topics,
}: {
  posts: PostCard[];
  topics: { name: string; slug: string }[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get('q') ?? '';
  const topic = params.get('topic') ?? '';
  const level = params.get('level') ?? '';
  const tag = params.get('tag') ?? '';
  const [query, setQuery] = useState(q);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tags = useMemo(() => {
    const m = new Map<string, string>();
    posts.forEach((p) => p.tags.forEach((t) => m.set(t.slug, t.name)));
    return Array.from(m, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [posts]);

  const filtered = posts.filter(
    (p) =>
      (!topic || p.topic?.slug === topic) &&
      (!level || p.difficulty === level) &&
      (!tag || p.tags.some((t) => t.slug === tag)) &&
      (!q ||
        matchesQuery(
          [p.title, p.excerpt, p.topic?.name ?? '', ...p.tags.map((t) => t.name)].join(' '),
          q,
        )),
  );
  const active = Boolean(q || topic || level || tag);

  return (
    <div>
      <form
        role="search"
        aria-label="Search notes"
        className="grid gap-3 border-y border-line py-5 md:grid-cols-12 md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query.trim() });
        }}
      >
        <div className="md:col-span-5">
          <label htmlFor="blog-q" className="label mb-1.5 block">
            Search
          </label>
          <div className="flex gap-2">
            <input
              id="blog-q"
              type="search"
              className="input"
              placeholder="Backpropagation, indexing, RAG…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) update({ q: '' });
              }}
            />
            <button className="btn-ghost shrink-0" type="submit">
              Go
            </button>
          </div>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="blog-topic" className="label mb-1.5 block">
            Topic
          </label>
          <select
            id="blog-topic"
            className="input"
            value={topic}
            onChange={(e) => update({ topic: e.target.value })}
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="blog-level" className="label mb-1.5 block">
            Level
          </label>
          <select
            id="blog-level"
            className="input"
            value={level}
            onChange={(e) => update({ level: e.target.value })}
          >
            <option value="">Any level</option>
            {Object.entries(DIFFICULTY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="blog-tag" className="label mb-1.5 block">
            Tag
          </label>
          <select
            id="blog-tag"
            className="input"
            value={tag}
            onChange={(e) => update({ tag: e.target.value })}
          >
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div className="mt-4 flex items-center justify-between">
        <p className="label" aria-live="polite">
          {filtered.length} note{filtered.length === 1 ? '' : 's'}
        </p>
        {active && (
          <button
            type="button"
            className="chip"
            onClick={() => {
              setQuery('');
              router.replace(pathname, { scroll: false });
            }}
          >
            Reset ×
          </button>
        )}
      </div>
      {filtered.length ? (
        <div className="mt-6 border-t border-line">
          {filtered.map((p) => (
            <PostRow key={p.slug} post={p} headingLevel="h3" />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No notes match">Try a different search or topic.</EmptyState>
        </div>
      )}
    </div>
  );
}
