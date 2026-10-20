'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { DESKTOP_MOTION, getGsap, useGsapEffect } from '@/components/motion/gsap';

export type Station = {
  index: string;
  title: string;
  kicker: string;
  body: string;
  facts: { label: string; href?: string }[];
  glyph: 'proof' | 'graph' | 'stack' | 'signal' | 'book';
};

function Glyph({ kind }: { kind: Station['glyph'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 } as const;
  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16 text-accent" aria-hidden>
      {kind === 'proof' && (
        <g {...common}>
          <path d="M14 60 L40 14 L66 60 Z" />
          <path d="M40 14 V60" strokeDasharray="2 3" />
          <text x="34" y="74" fontSize="9" fill="currentColor" stroke="none" fontFamily="monospace">
            ∎
          </text>
        </g>
      )}
      {kind === 'graph' && (
        <g {...common}>
          {[
            [16, 20],
            [40, 12],
            [64, 24],
            [24, 52],
            [56, 60],
            [40, 38],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.5" />
          ))}
          <path d="M16 20 L40 38 L64 24 M40 12 L40 38 L24 52 M40 38 L56 60" />
        </g>
      )}
      {kind === 'stack' && (
        <g {...common}>
          <rect x="14" y="16" width="52" height="12" />
          <rect x="14" y="34" width="52" height="12" />
          <rect x="14" y="52" width="52" height="12" />
          <path d="M22 22 h10 M22 40 h18 M22 58 h6" />
        </g>
      )}
      {kind === 'signal' && (
        <g {...common}>
          <path d="M8 40 C 16 16, 24 64, 32 40 S 48 16, 56 40 S 68 58, 74 40" />
          <path d="M8 66 H74 M8 14 V66" strokeDasharray="1 3" />
        </g>
      )}
      {kind === 'book' && (
        <g {...common}>
          <path d="M40 20 C 30 14, 18 14, 10 18 V62 C 18 58, 30 58, 40 64 C 50 58, 62 58, 70 62 V18 C 62 14, 50 14, 40 20 Z" />
          <path d="M40 20 V64" />
        </g>
      )}
    </svg>
  );
}

/**
 * MATHEMATICS → CS → SOFTWARE → AI/ML RESEARCH → KNOWLEDGE SHARING
 * Desktop with motion: the section pins and the stations travel horizontally (scrubbed by native scroll),
 * while an SVG path draws itself. Elsewhere: a vertical timeline in normal document flow.
 */
export function Trajectory({ stations }: { stations: Station[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGsapEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const { gsap, ScrollTrigger } = getGsap();
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      section.dataset.mode = 'horizontal';
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 64);
      const path = pathRef.current;
      const length = path?.getTotalLength() ?? 0;
      if (path) {
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      tl.to(track, { x: () => -distance(), ease: 'none' }, 0);
      if (path) tl.to(path, { strokeDashoffset: 0, ease: 'none' }, 0);
      ScrollTrigger.refresh();
      return () => {
        delete section.dataset.mode;
        if (path) {
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
        }
      };
    });
    return () => mm.revert();
  }, []);

  // The wrapper is owned by React; ScrollTrigger inserts its pin-spacer *inside* it, so unmounting
  // removes the wrapper cleanly even though the pinned <section> has been re-parented.
  return (
    <div>
      <section
        ref={sectionRef}
        id="trajectory"
        aria-labelledby="trajectory-title"
        className="group/traj relative overflow-hidden border-t border-line py-section data-[mode=horizontal]:flex data-[mode=horizontal]:h-[100svh] data-[mode=horizontal]:flex-col data-[mode=horizontal]:justify-center data-[mode=horizontal]:py-0"
      >
        <div className="container-page">
          <div className="flex items-center gap-3">
            <span className="font-mono text-mono-xs text-accent">01</span>
            <span className="section-index">Trajectory</span>
          </div>
          <h2
            id="trajectory-title"
            className="mt-5 max-w-4xl font-display text-display-sm font-semibold uppercase"
            style={{ fontStretch: '78%' }}
          >
            Mathematics <span className="text-accent">→</span> computer science{' '}
            <span className="text-accent">→</span> software <span className="text-accent">→</span>{' '}
            AI/ML research <span className="text-accent">→</span> knowledge sharing
          </h2>
        </div>

        <div className="relative mt-12 group-data-[mode=horizontal]/traj:mt-14">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-[52px] hidden h-24 w-full text-line group-data-[mode=horizontal]/traj:block"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
          >
            <path
              ref={pathRef}
              d="M0 50 C 50 10, 100 90, 150 50 S 250 10, 300 50 S 400 90, 450 50 S 550 10, 600 50 S 700 90, 750 50 S 850 10, 1000 50"
              fill="none"
              stroke="rgb(var(--c-signal))"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="container-page group-data-[mode=horizontal]/traj:max-w-none group-data-[mode=horizontal]/traj:px-0">
            <ol
              ref={trackRef}
              className="relative grid gap-0 border-l border-line pl-6 md:pl-10 group-data-[mode=horizontal]/traj:flex group-data-[mode=horizontal]/traj:w-max group-data-[mode=horizontal]/traj:gap-10 group-data-[mode=horizontal]/traj:border-l-0 group-data-[mode=horizontal]/traj:pl-[var(--gutter)] group-data-[mode=horizontal]/traj:pr-[var(--gutter)]"
            >
              {stations.map((s) => (
                <li
                  key={s.index}
                  className="relative py-8 group-data-[mode=horizontal]/traj:w-[min(30rem,38vw)] group-data-[mode=horizontal]/traj:shrink-0 group-data-[mode=horizontal]/traj:py-0"
                >
                  <span
                    aria-hidden
                    className="absolute -left-[calc(1.5rem+5px)] top-10 h-2.5 w-2.5 rounded-full border border-accent bg-bg md:-left-[calc(2.5rem+5px)] group-data-[mode=horizontal]/traj:hidden"
                  />
                  <div className="flex items-start justify-between gap-6">
                    <span className="font-mono text-mono-xs text-blue">
                      {s.index} / {s.kicker}
                    </span>
                    <Glyph kind={s.glyph} />
                  </div>
                  <h3
                    className="mt-4 font-display text-4xl font-bold uppercase leading-none md:text-5xl"
                    style={{ fontStretch: '70%' }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-4 max-w-md text-fg/80">{s.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {s.facts.map((f) => (
                      <li key={f.label}>
                        {f.href ? (
                          <Link href={f.href} className="chip">
                            {f.label}
                          </Link>
                        ) : (
                          <span className="chip pointer-events-none">{f.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
