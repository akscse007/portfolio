'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { ProjectCard } from '@/server/repos/public';
import { MediaImage } from '@/components/ui/Media';
import { EmptyState } from '@/components/ui/primitives';
import { ProjectStage } from './ProjectStage';
import { cn, pad2 } from '@/lib/utils';

export function ProjectIndex({
  projects,
  categories,
}: {
  projects: ProjectCard[];
  categories: string[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const category = params.get('category') ?? '';
  const skill = params.get('skill') ?? '';

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!category || p.category === category) &&
          (!skill || p.skills.some((s) => s.slug === skill)),
      ),
    [projects, category, skill],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const skillName = skill
    ? projects.flatMap((p) => p.skills).find((s) => s.slug === skill)?.name
    : null;

  return (
    <div>
      <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-2">
        <button
          type="button"
          className="chip"
          aria-pressed={!category}
          onClick={() => setParam('category', '')}
        >
          All · {projects.length}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={category === c}
            onClick={() => setParam('category', category === c ? '' : c)}
          >
            {c} · {projects.filter((p) => p.category === c).length}
          </button>
        ))}
      </div>
      {skillName && (
        <p className="mt-4 flex items-center gap-3 text-sm text-muted">
          Showing projects using <strong className="text-fg">{skillName}</strong>
          <button type="button" className="chip" onClick={() => setParam('skill', '')}>
            Clear ×
          </button>
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {filtered.length} project{filtered.length === 1 ? '' : 's'} shown
      </p>

      {filtered.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="No projects match"
            action={
              <button
                type="button"
                className="btn-ghost"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Reset filters
              </button>
            }
          >
            Try another category.
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-12 grid gap-x-8 gap-y-16 md:grid-cols-12">
          {filtered.map((p, i) => {
            const wide = i % 3 === 0;
            return (
              <li
                key={p.slug}
                className={cn(
                  wide ? 'md:col-span-12 lg:col-span-7' : 'md:col-span-6 lg:col-span-5',
                  !wide && i % 3 === 2 && 'lg:col-start-8',
                )}
              >
                <Link href={`/work/${p.slug}`} className="group block">
                  <div className="relative overflow-hidden rounded-sm border border-line">
                    {p.cover ? (
                      <MediaImage
                        image={p.cover}
                        ratio={wide ? '16 / 9' : '4 / 3'}
                        imgClassName="transition-transform duration-slow ease-out-expo group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div
                        className="flex items-end bg-gradient-to-br from-surface to-bg p-6 sm:p-8"
                        style={{ aspectRatio: wide ? '16 / 9' : '4 / 3' }}
                      >
                        <div>
                          <p className="font-mono text-mono-xs uppercase text-accent">{p.category}</p>
                          <p
                            className="mt-2 font-display text-2xl font-bold uppercase leading-none text-fg/70 sm:text-3xl"
                            style={{ fontStretch: '74%' }}
                          >
                            {p.title}
                          </p>
                          {p.summary && (
                            <p className="mt-3 line-clamp-2 max-w-md text-sm text-muted">{p.summary}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-xs bg-bg/80 px-2 py-1 font-mono text-mono-xs">
                      {pad2(i + 1)}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="label">
                      {p.category}
                      {p.period ? ` · ${p.period}` : ''}
                    </p>
                    <ProjectStage stage={p.stage} note={p.stageNote} />
                  </div>
                  <h2
                    className="mt-3 font-display text-3xl font-bold uppercase leading-none transition-colors group-hover:text-accent md:text-4xl"
                    style={{ fontStretch: '74%' }}
                  >
                    {p.title}
                  </h2>
                  {p.subtitle && (
                    <p className="mt-2 font-serif text-lg italic text-fg/80">{p.subtitle}</p>
                  )}
                  <p className="mt-3 max-w-xl text-fg/75">{p.summary}</p>
                  {p.skills.length > 0 && (
                    <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                      {p.skills.map((s) => s.name).join(' · ')}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
