'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { PublicAchievement } from '@/server/repos/public';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_LABELS } from '@/lib/validation/schemas';
import { AchievementCard } from './AchievementCard';
import { Lightbox, type LightboxItem } from '@/components/ui/Lightbox';
import { EmptyState } from '@/components/ui/primitives';
import { matchesQuery } from '@/lib/utils';

type Sort = 'featured' | 'newest' | 'oldest' | 'custom';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'custom', label: 'Curated order' },
];

function sortKeyDate(a: PublicAchievement) {
  return a.issueDate
    ? new Date(a.issueDate).getTime()
    : a.year
      ? new Date(`${a.year}-07-01`).getTime()
      : 0;
}

/** Builds lightbox entries for every record with a viewable image or public document. */
export function toLightboxItems(list: PublicAchievement[]) {
  const items: (LightboxItem & { slug: string })[] = [];
  for (const a of list) {
    const img = a.preview ?? a.photos[0];
    if (img) {
      items.push({
        id: `${a.id}-${img.id}`,
        slug: a.slug,
        kind: 'IMAGE',
        src: img.display,
        original: a.document && a.document.kind === 'IMAGE' ? a.document.original : null,
        alt: img.alt || a.title,
        title: a.title,
        caption: `${a.issuer}${a.dateLabel ? ` · ${a.dateLabel}` : ''}`,
        href: `/achievements/${a.slug}`,
        hrefLabel: a.verificationUrl ? 'Details & credential' : 'Details',
        width: img.width,
        height: img.height,
      });
    } else if (a.document && a.document.kind === 'PDF') {
      items.push({
        id: `${a.id}-${a.document.id}`,
        slug: a.slug,
        kind: 'PDF',
        src: a.document.original,
        alt: a.document.alt || `${a.title} — certificate (PDF)`,
        title: a.title,
        caption: a.issuer,
        href: `/achievements/${a.slug}`,
        hrefLabel: 'Details',
      });
    }
  }
  return items;
}

export function AchievementsArchive({ achievements }: { achievements: PublicAchievement[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const issuer = params.get('issuer') ?? '';
  const year = params.get('year') ?? '';
  const sort = (params.get('sort') as Sort) || 'featured';
  const [query, setQuery] = useState(q);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const issuers = useMemo(
    () => Array.from(new Set(achievements.map((a) => a.issuer))).sort(),
    [achievements],
  );
  const years = useMemo(
    () =>
      Array.from(
        new Set(achievements.map((a) => a.year).filter((y): y is number => Boolean(y))),
      ).sort((a, b) => b - a),
    [achievements],
  );
  const categories = ACHIEVEMENT_CATEGORIES.filter((c) =>
    achievements.some((a) => a.category === c),
  );

  const filtered = useMemo(() => {
    const list = achievements.filter(
      (a) =>
        (!category || a.category === category) &&
        (!issuer || a.issuer === issuer) &&
        (!year || String(a.year) === year) &&
        (!q ||
          matchesQuery(
            [
              a.title,
              a.issuer,
              a.summary,
              a.categoryLabel,
              ...a.skills,
              ...a.tags.map((t) => t.name),
            ].join(' '),
            q,
          )),
    );
    const sorted = [...list];
    if (sort === 'newest') sorted.sort((a, b) => sortKeyDate(b) - sortKeyDate(a));
    else if (sort === 'oldest') sorted.sort((a, b) => sortKeyDate(a) - sortKeyDate(b));
    else if (sort === 'custom') sorted.sort((a, b) => a.order - b.order);
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
    return sorted;
  }, [achievements, category, issuer, year, q, sort]);

  const items = useMemo(() => toLightboxItems(filtered), [filtered]);
  const openFor = (slug: string) => {
    const idx = items.findIndex((i) => i.slug === slug);
    return idx >= 0 ? () => setLightbox(idx) : undefined;
  };
  const active = Boolean(q || category || issuer || year);

  return (
    <div>
      <form
        role="search"
        aria-label="Search and filter achievements"
        className="grid gap-3 border-y border-line py-5 md:grid-cols-12 md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query.trim() });
        }}
      >
        <div className="md:col-span-4">
          <label htmlFor="ach-q" className="label mb-1.5 block">
            Search
          </label>
          <div className="flex gap-2">
            <input
              id="ach-q"
              type="search"
              className="input"
              placeholder="Title, issuer, skill…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) update({ q: '' });
              }}
            />
            <button type="submit" className="btn-ghost shrink-0">
              Go
            </button>
          </div>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="ach-cat" className="label mb-1.5 block">
            Category
          </label>
          <select
            id="ach-cat"
            className="input"
            value={category}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {ACHIEVEMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="ach-issuer" className="label mb-1.5 block">
            Issuer
          </label>
          <select
            id="ach-issuer"
            className="input"
            value={issuer}
            onChange={(e) => update({ issuer: e.target.value })}
          >
            <option value="">All issuers</option>
            {issuers.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 md:col-span-3">
          <div>
            <label htmlFor="ach-year" className="label mb-1.5 block">
              Year
            </label>
            <select
              id="ach-year"
              className="input"
              value={year}
              onChange={(e) => update({ year: e.target.value })}
            >
              <option value="">Any</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ach-sort" className="label mb-1.5 block">
              Sort
            </label>
            <select
              id="ach-sort"
              className="input"
              value={sort}
              onChange={(e) =>
                update({ sort: e.target.value === 'featured' ? '' : e.target.value })
              }
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="label" aria-live="polite">
          {filtered.length} of {achievements.length} record{achievements.length === 1 ? '' : 's'}
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
            Reset filters ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing matches those filters"
            action={
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setQuery('');
                  router.replace(pathname, { scroll: false });
                }}
              >
                Reset filters
              </button>
            }
          >
            Try a broader search or clear a filter.
          </EmptyState>
        </div>
      ) : (
        <ul
          className="mt-10 columns-1 gap-8 sm:columns-2 xl:columns-3"
          data-testid="achievement-grid"
        >
          {filtered.map((a) => (
            <li key={a.slug} className="mb-14 break-inside-avoid">
              <AchievementCard a={a} onOpen={openFor(a.slug)} headingLevel="h3" />
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        items={items}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        label="Certificate viewer"
      />
    </div>
  );
}
