import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAchievements, getCv, getProfile } from '@/server/repos/public';
import { renderMarkdown } from '@/lib/markdown';
import { pageMetadata, personJsonLd } from '@/lib/seo';
import { JsonLd, PageHero, Prose, SectionHeader } from '@/components/ui/primitives';
import { MediaImage } from '@/components/ui/Media';
import { Reveal } from '@/components/motion/Reveal';

export const metadata: Metadata = pageMetadata({
  title: 'About — From mathematics to intelligent software',
  description:
    'Biography, education, experience, research interests and technical stack of Akash Roy.',
  path: '/about',
  type: 'profile',
});

const KIND_LABEL: Record<string, string> = {
  WORK: 'Work',
  RESEARCH: 'Research',
  FREELANCE: 'Freelance',
  LEADERSHIP: 'Leadership',
  VOLUNTEER: 'Volunteer',
};

export default async function AboutPage() {
  const [profile, cv, achievements] = await Promise.all([getProfile(), getCv(), getAchievements()]);
  if (!profile) notFound();
  const bio = await renderMarkdown(profile.bio);
  const skillGroups = cv.skills.reduce<Record<string, typeof cv.skills>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});
  const leadership = achievements.filter((a) =>
    ['LEADERSHIP_VOLUNTEERING', 'SPORTS_EXTRACURRICULAR', 'AWARD_HONOUR'].includes(a.category),
  );

  return (
    <>
      <JsonLd data={personJsonLd(profile)} />
      <PageHero
        index="07"
        label="About"
        title={
          <>
            Mathematics,
            <br />
            <span className="font-serif font-normal normal-case italic text-accent">
              then machines.
            </span>
          </>
        }
        intro={profile.shortBio}
      />

      <section
        aria-labelledby="bio-h"
        className="container-page grid gap-12 border-t border-line py-section lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="bio-h" className="section-index">
            Biography
          </h2>
          {profile.portrait && (
            <MediaImage
              image={profile.portrait}
              className="mt-6 rounded-sm border border-line"
              ratio="4 / 5"
              sizes="(min-width: 1024px) 30vw, 100vw"
            />
          )}
          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="label">Based in</dt>
              <dd>{profile.location}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="label">Focus</dt>
              <dd className="text-right">{profile.headline}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile.cvUrl ? (
              <a href={profile.cvUrl} className="btn-primary">
                Download CV
              </a>
            ) : (
              <Link href="/resume" className="btn-primary">
                Résumé
              </Link>
            )}
            <Link href="/contact" className="btn-ghost">
              Contact
            </Link>
          </div>
        </div>
        <Prose html={bio.html} className="lg:col-span-8 lg:text-xl" />
      </section>

      <section
        id="education"
        aria-labelledby="edu-h"
        className="container-page scroll-mt-24 border-t border-line py-section"
      >
        <SectionHeader label="Education" id="edu-h" title="Formation" />
        <ol className="mt-12 border-l border-line pl-6 md:pl-10">
          {cv.education.map((e, i) => (
            <Reveal as="li" key={e.id} delay={i * 80} className="relative pb-10 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[calc(1.5rem+5px)] top-2 h-2.5 w-2.5 rounded-full bg-signal md:-left-[calc(2.5rem+5px)]"
              />
              <p className="label">{e.period}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">{e.credential}</h3>
              <p className="text-muted">{e.institution}</p>
              {e.result && <p className="mt-1 font-mono text-mono-sm text-accent">{e.result}</p>}
              {e.note && <p className="mt-2 text-sm text-fg/75">{e.note}</p>}
            </Reveal>
          ))}
        </ol>
      </section>

      <section
        id="experience"
        aria-labelledby="exp-h"
        className="container-page scroll-mt-24 border-t border-line py-section"
      >
        <SectionHeader label="Experience" id="exp-h" title="Work & research" />
        <ol className="mt-12 divide-y divide-line border-y border-line">
          {cv.experience.map((e) => (
            <li key={e.id} className="grid gap-4 py-10 md:grid-cols-12">
              <div className="md:col-span-3">
                <p className="label">{e.period}</p>
                <p className="label-accent mt-1">{KIND_LABEL[e.kind]}</p>
              </div>
              <div className="md:col-span-9">
                <h3 className="font-display text-2xl font-semibold">{e.role}</h3>
                <p className="mt-1 text-muted">
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline"
                    >
                      {e.organization} ↗
                    </a>
                  ) : (
                    e.organization
                  )}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                {e.summary && <p className="mt-4 text-fg/80">{e.summary}</p>}
                {e.highlights.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {e.highlights.map((h) => (
                      <li key={h} className="flex gap-3 text-fg/85">
                        <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-accent" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {leadership.length > 0 && (
        <section
          aria-labelledby="lead-h"
          className="container-page border-t border-line py-section"
        >
          <SectionHeader label="Leadership" id="lead-h" title="Beyond the code" />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leadership.map((a) => (
              <li key={a.slug} className="border-t border-line pt-4">
                <p className="label">{a.categoryLabel}</p>
                <Link
                  href={`/achievements/${a.slug}`}
                  className="mt-1 block font-display text-xl font-semibold hover:text-accent"
                >
                  {a.title}
                </Link>
                <p className="text-sm text-muted">{a.issuer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.researchInterests.length > 0 && (
        <section aria-labelledby="ri-h" className="container-page border-t border-line py-section">
          <SectionHeader label="Research interests" id="ri-h" title="Open questions" />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.researchInterests.map((r, i) => (
              <li key={r} className="flex gap-4 border-t border-line pt-4">
                <span className="font-mono text-mono-xs text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-xl">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        id="skills"
        aria-labelledby="skills-h"
        className="container-page scroll-mt-24 border-t border-line py-section"
      >
        <SectionHeader
          label="Technical stack"
          id="skills-h"
          title="Tools I use"
          intro="Grouped by purpose. Where a technology is used in a published project, it links to that work — no percentage bars, no invented years."
        />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(skillGroups).map(([group, skills]) => (
            <div key={group}>
              <h3 className="label-accent mb-4">{group}</h3>
              <ul className="space-y-2">
                {skills.map((s) => (
                  <li
                    key={s.slug}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line pb-2"
                  >
                    <span>{s.name}</span>
                    {s.projects.length > 0 && (
                      <Link
                        href={`/work?skill=${s.slug}`}
                        className="font-mono text-mono-xs text-muted hover:text-accent"
                      >
                        {s.projects.length} project{s.projects.length > 1 ? 's' : ''} →
                      </Link>
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
