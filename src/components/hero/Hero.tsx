import Link from 'next/link';
import { HeroCanvas } from './HeroCanvas';
import { HeroIntro } from './HeroIntro';
import { KolkataClock } from '@/components/layout/KolkataClock';
import { Magnetic } from '@/components/motion/Magnetic';
import { MediaImage } from '@/components/ui/Media';
import type { PublicProfile } from '@/server/repos/public';

/** Static SVG fallback (no JS / unsupported canvas / before hydration). */
function HeroFallback() {
  const lissajous = Array.from({ length: 361 }, (_, i) => {
    const u = (i / 360) * Math.PI * 2;
    return `${(70 + 22 * Math.sin(3 * u + 0.6)).toFixed(2)},${(48 + 22 * Math.sin(4 * u)).toFixed(2)}`;
  }).join(' ');
  const streams = Array.from({ length: 14 }, (_, k) => {
    const y0 = 6 + k * 6.5;
    const pts = Array.from({ length: 41 }, (_, i) => {
      const x = i * 2.5;
      const y = y0 + 3 * Math.sin(x * 0.07 + k * 0.6) + 2 * Math.cos(x * 0.03 - k);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return pts;
  });
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      {streams.map((pts, i) => (
        <polyline
          key={i}
          points={pts}
          fill="none"
          stroke="rgb(var(--c-fg) / 0.08)"
          strokeWidth="0.15"
        />
      ))}
      <polyline
        points={lissajous}
        fill="none"
        stroke="rgb(var(--c-signal) / 0.5)"
        strokeWidth="0.18"
      />
    </svg>
  );
}

export function Hero({ profile }: { profile: NonNullable<PublicProfile> }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
      data-hero
    >
      <div className="absolute inset-0 -z-10">
        <HeroFallback />
        <HeroCanvas />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-transparent to-bg" />
      </div>

      <div className="container-page flex flex-1 flex-col pb-10 pt-[calc(var(--header-h)+2rem)] md:pt-[calc(var(--header-h)+3rem)]">
        {/* Meta rail */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-mono-xs uppercase text-muted"
          data-hero-meta
        >
          <span>
            <span className="text-accent">00</span> — Index / Digital Lab
          </span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>{profile.location}</span>
            <span className="hidden text-blue sm:inline">22.57°N 88.36°E</span>
            {profile.showClock && <KolkataClock timezone={profile.timezone} />}
          </span>
        </div>

        <div className="mt-auto pt-16">
          {profile.availability && (
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-bg/60 px-3 py-1.5 font-mono text-mono-xs uppercase backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
              </span>
              {profile.availability}
            </p>
          )}

          <h1
            id="hero-title"
            className="font-display font-bold uppercase text-display-xl"
            style={{ fontStretch: '68%' }}
          >
            <span className="sr-only">{profile.tagline}</span>
            <span aria-hidden>
              <span className="mask-line" data-hero-line>
                <span>I build</span>
              </span>
              <span className="mask-line" data-hero-line>
                <span>
                  systems<span className="text-accent">.</span>
                </span>
              </span>
              <span className="mask-line" data-hero-line>
                <span>I study</span>
              </span>
              <span className="mask-line" data-hero-line>
                <span
                  className="font-serif font-normal normal-case italic tracking-[-0.02em] text-accent"
                  style={{ fontStretch: 'normal' }}
                >
                  patterns.
                </span>
              </span>
            </span>
          </h1>

          <div
            className={
              profile.portrait
                ? 'mt-10 grid gap-8 lg:grid-cols-12 lg:items-end'
                : 'mt-10 grid gap-8 md:grid-cols-12 md:items-end'
            }
          >
            {profile.portrait && (
              <div
                className="flex justify-center lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:justify-end"
                data-hero-fade
              >
                <div className="relative w-52 overflow-hidden rounded-sm sm:w-60 lg:w-full">
                  <MediaImage
                    image={profile.portrait}
                    priority
                    sizes="(min-width: 1024px) 30vw, 240px"
                    ratio="3 / 4"
                    className="ring-1 ring-line/50"
                  />
                </div>
              </div>
            )}
            <p
              className={
                profile.portrait
                  ? 'max-w-xl text-lg leading-relaxed text-fg/85 lg:col-span-8 lg:text-xl'
                  : 'max-w-xl text-lg leading-relaxed text-fg/85 md:col-span-6 md:text-xl'
              }
              data-hero-fade
            >
              {profile.subTagline}
              <span className="mt-3 block font-mono text-mono-sm uppercase text-muted">
                {profile.headline}
              </span>
            </p>
            <nav
              aria-label="Primary actions"
              className={
                profile.portrait
                  ? 'flex flex-wrap gap-3 lg:col-span-8'
                  : 'flex flex-wrap gap-3 md:col-span-6 md:justify-end'
              }
              data-hero-fade
            >
              <Magnetic>
                <Link href="/work" className="btn-primary">
                  Explore my work <span aria-hidden>→</span>
                </Link>
              </Magnetic>
              <Link href="/research" className="btn-ghost bg-bg/50 backdrop-blur-sm">
                Research &amp; achievements
              </Link>
              <Link href="/blog" className="btn-ghost bg-bg/50 backdrop-blur-sm">
                Read my notes
              </Link>
              <Link href="/contact" className="btn-ghost bg-bg/50 backdrop-blur-sm">
                Contact me
              </Link>
            </nav>
          </div>

          <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-5">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-mono-sm uppercase">
              {profile.githubUrl && (
                <li>
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="link-underline inline-flex min-h-11 items-center"
                  >
                    GitHub ↗
                  </a>
                </li>
              )}
              {profile.linkedinUrl && (
                <li>
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="link-underline inline-flex min-h-11 items-center"
                  >
                    LinkedIn ↗
                  </a>
                </li>
              )}
              {profile.cvUrl && (
                <li>
                  <a
                    href={profile.cvUrl}
                    className="link-underline inline-flex min-h-11 items-center"
                  >
                    CV (PDF)
                  </a>
                </li>
              )}
              <li>
                <Link href="/resume" className="link-underline inline-flex min-h-11 items-center">
                  Résumé
                </Link>
              </li>
            </ul>
            <a
              href="#trajectory"
              className="group flex items-center gap-3 font-mono text-mono-xs uppercase text-muted hover:text-fg"
            >
              <span>Scroll</span>
              <span aria-hidden className="relative block h-10 w-px overflow-hidden bg-line">
                <span className="absolute inset-0 animate-scroll-cue bg-signal" />
              </span>
            </a>
          </div>
        </div>
      </div>
      <HeroIntro />
    </section>
  );
}
