import type { Metadata } from 'next';
import Link from 'next/link';
import { getAchievements, getCv, getPosts, getProfile, getProjects } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PageHero, SectionHeader, EmptyState } from '@/components/ui/primitives';
import { NarxDiagram } from '@/components/home/NarxDiagram';
import { Reveal } from '@/components/motion/Reveal';
import { ProjectStage } from '@/components/work/ProjectStage';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { PostRow } from '@/components/blog/PostRow';

export const metadata: Metadata = pageMetadata({
  title: 'Research — Patterns in Time',
  description:
    'Time-series modelling with NARX networks, forecasting and deep learning for quantitative finance — research by Akash Roy.',
  path: '/research',
});

export default async function ResearchPage() {
  const [profile, projects, achievements, posts, cv] = await Promise.all([
    getProfile(),
    getProjects(),
    getAchievements(),
    getPosts(),
    getCv(),
  ]);
  const research = projects.filter((p) => p.category === 'Research' || p.stage === 'RESEARCH');
  const recognition = achievements.filter((a) =>
    ['RESEARCH_INTERNSHIP', 'ACADEMIC', 'AWARD_HONOUR', 'COURSE_SPECIALIZATION'].includes(
      a.category,
    ),
  );
  const notes = posts.filter((p) =>
    [
      'time-series-forecasting',
      'research-notes',
      'machine-learning',
      'deep-learning',
      'quantitative-finance',
    ].includes(p.topic?.slug ?? ''),
  );
  const vecc = cv.experience.find((e) => e.kind === 'RESEARCH');

  return (
    <>
      <PageHero
        index="02"
        label="Research"
        title={
          <>
            Patterns in{' '}
            <span className="font-serif font-normal normal-case italic text-accent">time</span>
          </>
        }
        intro="My research sits where mathematics meets data: modelling dynamic systems from their history, and asking whether a forecast can be trusted beyond one step ahead."
      >
        {profile?.researchInterests.length ? (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Research interests">
            {profile.researchInterests.map((r) => (
              <li key={r} className="chip pointer-events-none">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </PageHero>

      {vecc && (
        <section aria-labelledby="vecc-h" className="border-t border-line bg-surface/40 py-section">
          <div className="container-page grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="label-accent">
                {vecc.period} · {vecc.role}
              </p>
              <h2
                id="vecc-h"
                className="mt-4 font-display text-display-sm font-bold uppercase"
                style={{ fontStretch: '74%' }}
              >
                NARX modelling at VECC
              </h2>
              <p className="mt-3 text-muted">{vecc.organization}</p>
              <ul className="mt-8 space-y-4">
                {vecc.highlights.map((h) => (
                  <li key={h} className="flex gap-3 text-fg/85">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-8 rounded-sm border border-line bg-bg/60 p-4 text-sm text-muted">
                {vecc.summary}
              </p>
            </div>
            <Reveal className="lg:col-span-7">
              <NarxDiagram />
              <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-3">
                <div>
                  <dt className="label">Process-variable datasets</dt>
                  <dd
                    className="mt-1 font-display text-4xl font-bold"
                    style={{ fontStretch: '72%' }}
                  >
                    11
                  </dd>
                </div>
                <div>
                  <dt className="label">Unified rows (approx.)</dt>
                  <dd
                    className="mt-1 font-display text-4xl font-bold"
                    style={{ fontStretch: '72%' }}
                  >
                    1.47M
                  </dd>
                </div>
                <div>
                  <dt className="label">Studies</dt>
                  <dd className="mt-1 font-display text-xl font-semibold">
                    Single- &amp; multi-target
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>
      )}

      <section
        aria-labelledby="threads-h"
        className="container-page border-t border-line py-section"
      >
        <SectionHeader label="Research threads" id="threads-h" title="Projects" />
        {research.length ? (
          <ul className="mt-12 divide-y divide-line border-y border-line">
            {research.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/work/${p.slug}`}
                  className="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline"
                >
                  <span className="label md:col-span-2">{p.period || p.category}</span>
                  <span className="md:col-span-6">
                    <span
                      className="block font-display text-3xl font-bold uppercase leading-none group-hover:text-accent"
                      style={{ fontStretch: '74%' }}
                    >
                      {p.title}
                    </span>
                    <span className="mt-2 block text-fg/75">{p.summary}</span>
                  </span>
                  <span className="md:col-span-4 md:text-right">
                    <ProjectStage stage={p.stage} note={p.stageNote} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-12">
            <EmptyState title="Research write-ups are in progress" />
          </div>
        )}
      </section>

      {recognition.length > 0 && (
        <section aria-labelledby="rec-h" className="container-page border-t border-line py-section">
          <SectionHeader label="Recognition" id="rec-h" title="Academic & research record" />
          <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {recognition.slice(0, 6).map((a) => (
              <AchievementCard key={a.slug} a={a} />
            ))}
          </div>
          <Link href="/achievements" className="btn-ghost mt-12">
            Full archive →
          </Link>
        </section>
      )}

      {notes.length > 0 && (
        <section
          aria-labelledby="notes-h"
          className="container-page border-t border-line py-section"
        >
          <SectionHeader label="Notes" id="notes-h" title="Research notes" />
          <div className="mt-12 border-t border-line">
            {notes.map((p) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
