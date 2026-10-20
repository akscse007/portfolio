'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PublicAchievement } from '@/server/repos/public';
import { MediaImage, Placeholder } from '@/components/ui/Media';
import { Lightbox } from '@/components/ui/Lightbox';
import { Pill } from '@/components/ui/primitives';
import { achievementDate } from './AchievementCard';
import { toLightboxItems } from './AchievementsArchive';

/** Art-directed featured block: one large document "on the wall" with supporting entries. */
export function FeaturedAchievements({ featured }: { featured: PublicAchievement[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const items = toLightboxItems(featured);
  if (!featured.length) return null;
  const [lead, ...rest] = featured;
  const open = (slug: string) => {
    const i = items.findIndex((x) => x.slug === slug);
    if (i >= 0) setIndex(i);
  };
  const leadImg = lead!.preview ?? lead!.photos[0];

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <article className="lg:col-span-7">
        <div className="relative rounded-xs bg-elevated p-4 shadow-doc sm:p-6">
          {leadImg ? (
            <button
              type="button"
              onClick={() => open(lead!.slug)}
              className="block w-full cursor-zoom-in"
              aria-label={`View full screen: ${lead!.title}`}
            >
              <MediaImage
                image={leadImg}
                fit="contain"
                className="bg-transparent"
                sizes="(min-width: 1024px) 55vw, 100vw"
                priority
              />
            </button>
          ) : (
            <Placeholder
              variant="document"
              seed={lead!.slug}
              ratio="1.414 / 1"
              label={lead!.hasCertificate ? 'Preview awaiting approval' : 'No certificate image'}
            />
          )}
          <span className="absolute -left-2 top-6 hidden rotate-[-90deg] origin-left font-mono text-mono-xs uppercase tracking-[0.2em] text-muted sm:block">
            Exhibit 01
          </span>
        </div>
        <div className="mt-6">
          <p className="label-accent">{lead!.categoryLabel}</p>
          <h3
            className="mt-2 font-display text-3xl font-bold uppercase leading-none md:text-4xl"
            style={{ fontStretch: '74%' }}
          >
            <Link href={`/achievements/${lead!.slug}`} className="hover:text-accent">
              {lead!.title}
            </Link>
          </h3>
          <p className="mt-2 text-muted">
            {lead!.issuer}
            {achievementDate(lead!) ? ` · ${achievementDate(lead!)}` : ''}
          </p>
          {lead!.summary && <p className="mt-4 max-w-xl text-fg/80">{lead!.summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {lead!.verified && <Pill tone="accent">Verified</Pill>}
            {lead!.verificationUrl && (
              <a
                href={lead!.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="chip"
              >
                View credential ↗
              </a>
            )}
          </div>
        </div>
      </article>
      <ul className="space-y-10 lg:col-span-5 lg:pt-16">
        {rest.map((a, i) => {
          const img = a.preview ?? a.photos[0];
          return (
            <li
              key={a.slug}
              className="grid grid-cols-[7.5rem_1fr] gap-5 border-t border-line pt-6 sm:grid-cols-[10rem_1fr]"
            >
              {img ? (
                <button
                  type="button"
                  onClick={() => open(a.slug)}
                  className="block cursor-zoom-in self-start rounded-xs bg-elevated p-2 shadow-doc"
                  aria-label={`View full screen: ${a.title}`}
                >
                  <MediaImage image={img} fit="contain" className="bg-transparent" sizes="160px" />
                </button>
              ) : (
                <Placeholder variant="document" seed={a.slug} ratio="1.414 / 1" label="No image" />
              )}
              <div>
                <p className="label">
                  Exhibit {String(i + 2).padStart(2, '0')} · {a.categoryLabel}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
                  <Link href={`/achievements/${a.slug}`} className="hover:text-accent">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted">{a.issuer}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <Lightbox
        items={items}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        label="Featured"
      />
    </div>
  );
}
