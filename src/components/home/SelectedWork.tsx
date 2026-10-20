'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { ProjectCard } from '@/server/repos/public';
import { MediaImage, Placeholder } from '@/components/ui/Media';
import { ProjectStage } from '@/components/work/ProjectStage';
import { DESKTOP_MOTION, getGsap, useGsapEffect } from '@/components/motion/gsap';
import { pad2 } from '@/lib/utils';

/**
 * Pinned project storytelling (desktop): an index column stays pinned via CSS `position: sticky`
 * while case-study panels scroll past; the active entry is tracked with IntersectionObserver.
 * Covers get a gentle scrubbed parallax. On mobile everything is a normal stacked list.
 */
export function SelectedWork({ projects }: { projects: ProjectCard[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useGsapEffect(() => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-project]') ?? [],
    );
    if (!items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.project));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    items.forEach((el) => io.observe(el));

    const { gsap } = getGsap();
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      items.forEach((el) => {
        const media = el.querySelector('[data-parallax]');
        if (!media) return;
        gsap.fromTo(
          media,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
    });
    return () => {
      io.disconnect();
      mm.revert();
    };
  }, [projects.length]);

  if (!projects.length) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="hidden lg:col-span-4 lg:block">
        <div className="sticky top-[calc(var(--header-h)+3rem)]">
          <p className="label mb-6">Index</p>
          <ol className="space-y-1">
            {projects.map((p, i) => (
              <li key={p.slug}>
                <a
                  href={`#project-${p.slug}`}
                  className="group flex min-h-11 items-baseline gap-4 py-1"
                  aria-current={active === i ? 'true' : undefined}
                >
                  <span
                    className={`font-mono text-mono-xs transition-colors ${active === i ? 'text-accent' : 'text-muted'}`}
                  >
                    {pad2(i + 1)}
                  </span>
                  <span
                    className={`font-display text-2xl font-semibold uppercase transition-[color,transform] duration-base ease-out-expo ${
                      active === i ? 'translate-x-1 text-fg' : 'text-muted group-hover:text-fg'
                    }`}
                    style={{ fontStretch: '78%' }}
                  >
                    {p.title}
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-10 h-px w-full bg-line">
            <div
              className="h-px bg-signal transition-[width] duration-slow ease-out-expo"
              style={{ width: `${((active + 1) / projects.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol ref={listRef} className="space-y-20 lg:col-span-8 lg:space-y-32">
        {projects.map((p, i) => (
          <li key={p.slug} id={`project-${p.slug}`} data-project={i} className="scroll-mt-28">
            <Link href={`/work/${p.slug}`} className="group block">
              <div className="relative overflow-hidden rounded-sm border border-line">
                <div data-parallax className="will-change-transform">
                  {p.cover ? (
                    <MediaImage
                      image={p.cover}
                      ratio="16 / 10"
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      imgClassName="scale-[1.08] transition-transform duration-slow ease-out-expo group-hover:scale-[1.12]"
                    />
                  ) : (
                    <Placeholder
                      ratio="16 / 10"
                      seed={p.slug}
                      label={`${p.category} · cover pending`}
                    />
                  )}
                </div>
                <span className="absolute left-4 top-4 font-mono text-mono-xs text-fg mix-blend-difference">
                  {pad2(i + 1)} / {pad2(projects.length)}
                </span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="label">
                    {p.category} · {p.period}
                  </p>
                  <h3
                    className="mt-2 font-display text-4xl font-bold uppercase leading-none transition-colors group-hover:text-accent md:text-5xl"
                    style={{ fontStretch: '72%' }}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-fg/80">{p.summary}</p>
                </div>
                <span className="font-mono text-mono-sm uppercase text-muted transition-colors group-hover:text-fg">
                  Case study →
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ProjectStage stage={p.stage} note={p.stageNote} />
                {p.skills.slice(0, 5).map((s) => (
                  <span
                    key={s.slug}
                    className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
