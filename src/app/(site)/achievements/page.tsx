import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAchievements } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { AchievementsArchive } from '@/components/achievements/AchievementsArchive';
import { FeaturedAchievements } from '@/components/achievements/FeaturedAchievements';
import { MilestoneTimeline } from '@/components/achievements/MilestoneTimeline';
import { Gallery } from '@/components/ui/Gallery';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import type { PublicImage } from '@/server/repos/public';

export const metadata: Metadata = pageMetadata({
  title: 'Achievements — Proof of Work',
  description:
    'Certificates, academic achievements, research recognition, awards and leadership — the archive of Akash Roy.',
  path: '/achievements',
});

export default async function AchievementsPage() {
  const achievements = await getAchievements();
  const featured = achievements.filter((a) => a.featured).slice(0, 4);
  const withDocuments = achievements.filter((a) => a.preview || a.document).length;
  const categories = new Set(achievements.map((a) => a.category)).size;
  const years = achievements.map((a) => a.year).filter((y): y is number => Boolean(y));
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—';
  const photos: PublicImage[] = achievements.flatMap((a) =>
    [...a.photos, ...a.gallery].map((p) => ({
      ...p,
      caption: p.caption ?? `${a.title} — ${a.issuer}`,
    })),
  );

  return (
    <>
      <section className="container-page relative overflow-hidden pb-16 pt-[calc(var(--header-h)+3.5rem)] md:pt-[calc(var(--header-h)+6rem)]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-mono-xs text-accent">03</span>
          <span className="section-index">Achievements &amp; certificates</span>
        </div>
        <h1
          className="mt-6 font-display text-display-xl font-bold uppercase"
          style={{ fontStretch: '66%' }}
        >
          Proof of
          <br />
          <span className="font-serif font-normal normal-case italic text-accent">work.</span>
        </h1>
        <div className="mt-10 grid gap-10 md:grid-cols-12">
          <p className="max-w-xl text-lg leading-relaxed text-fg/85 md:col-span-6 md:text-xl">
            A curated archive of learning, research, recognition and leadership. Each record shows
            the original document where the owner has approved it for publication — nothing here is
            a mock-up.
          </p>
          <dl className="grid grid-cols-3 gap-4 border-t border-line pt-5 md:col-span-6 md:self-end">
            <div>
              <dt className="label">Published records</dt>
              <dd className="mt-1 font-display text-4xl font-bold" style={{ fontStretch: '72%' }}>
                {achievements.length}
              </dd>
            </div>
            <div>
              <dt className="label">With documents</dt>
              <dd className="mt-1 font-display text-4xl font-bold" style={{ fontStretch: '72%' }}>
                {withDocuments}
              </dd>
            </div>
            <div>
              <dt className="label">Categories · Span</dt>
              <dd className="mt-1 font-display text-4xl font-bold" style={{ fontStretch: '72%' }}>
                {categories}
                <span className="ml-2 font-mono text-sm font-normal text-muted">{span}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {achievements.length === 0 ? (
        <section className="container-page pb-section">
          <EmptyState title="The archive is being curated">
            Records are published once their documents have been reviewed and approved.
          </EmptyState>
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <section
              aria-labelledby="featured-h"
              className="container-page border-t border-line py-20"
            >
              <SectionHeader label="Featured" id="featured-h" title="On the wall" />
              <div className="mt-14">
                <FeaturedAchievements featured={featured} />
              </div>
            </section>
          )}

          <section
            aria-labelledby="archive-h"
            className="container-page border-t border-line py-20"
          >
            <SectionHeader label="The archive" id="archive-h" title="Every record" />
            <div className="mt-12">
              <Suspense fallback={<div className="skeleton h-96 rounded-sm" />}>
                <AchievementsArchive achievements={achievements} />
              </Suspense>
            </div>
          </section>

          {photos.length > 0 && (
            <section aria-labelledby="field-h" className="border-t border-line bg-surface/40 py-20">
              <div className="container-page">
                <SectionHeader
                  label="From the field"
                  id="field-h"
                  title="Moments"
                  intro="Award ceremonies and event photographs."
                />
                <div className="mt-12">
                  <Gallery images={photos} label="Photographs" />
                </div>
              </div>
            </section>
          )}

          <section
            aria-labelledby="timeline-h"
            className="container-page border-t border-line py-20"
          >
            <SectionHeader
              label="Milestones"
              id="timeline-h"
              title="Timeline"
              intro="Academic, technical and leadership milestones by year."
            />
            <div className="mt-12">
              <MilestoneTimeline achievements={achievements} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
