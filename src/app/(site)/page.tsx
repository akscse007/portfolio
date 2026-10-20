import Link from 'next/link';
import type { Metadata } from 'next';
import { Hero } from '@/components/hero/Hero';
import { Trajectory } from '@/components/home/Trajectory';
import { SelectedWork } from '@/components/home/SelectedWork';
import { NarxDiagram } from '@/components/home/NarxDiagram';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { PostRow } from '@/components/blog/PostRow';
import { MiniLissajous } from '@/components/playground/MiniLissajous';
import { Reveal } from '@/components/motion/Reveal';
import { EmptyState, JsonLd, SectionHeader } from '@/components/ui/primitives';
import { STATIONS } from '@/content/trajectory';
import { getAchievements, getPosts, getProfile, getProjects } from '@/server/repos/public';
import { pageMetadata, personJsonLd, websiteJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const meta = pageMetadata({
    title: 'Akash Roy — Digital Lab',
    description: profile?.shortBio,
    path: '/',
    type: 'profile',
  });
  return {
    ...meta,
    title: { absolute: 'Akash Roy — Digital Lab · I build systems. I study patterns.' },
  };
}

export default async function HomePage() {
  const [profile, projects, achievements, posts] = await Promise.all([
    getProfile(),
    getProjects(),
    getAchievements(),
    getPosts(),
  ]);
  if (!profile)
    return (
      <div className="container-page py-40">
        <p className="label">Setup required</p>
        <h1 className="mt-4 font-display text-4xl font-bold">
          Run <code>npm run db:seed</code> to create the profile.
        </h1>
      </div>
    );

  const featuredProjects = (
    projects.filter((p) => p.featured).length ? projects.filter((p) => p.featured) : projects
  ).slice(0, 5);
  const featuredAchievements = (
    achievements.filter((a) => a.featured).length
      ? achievements.filter((a) => a.featured)
      : achievements
  ).slice(0, 3);
  const latestPosts = posts.slice(0, 4);

  return (
    <>
      <JsonLd data={personJsonLd(profile)} />
      <JsonLd data={websiteJsonLd()} />
      <Hero profile={profile} />
      <Trajectory stations={STATIONS} />

      {/* 02 — Selected work */}
      <section
        aria-labelledby="work-title"
        className="container-page border-t border-line py-section"
      >
        <SectionHeader
          index="02"
          label="Selected work"
          id="work-title"
          title={
            <>
              Systems that{' '}
              <span className="font-serif font-normal normal-case italic text-accent">ship</span>
            </>
          }
          intro="Production platforms, AI-assisted tools and research prototypes. Each case study separates what is live from what is a demonstration."
        />
        <div className="mt-16 md:mt-24">
          {featuredProjects.length ? (
            <SelectedWork projects={featuredProjects} />
          ) : (
            <EmptyState title="Case studies are being written">
              Published projects will appear here.
            </EmptyState>
          )}
        </div>
        <div className="mt-16 flex justify-end">
          <Link href="/work" className="btn-ghost">
            All projects ({projects.length}) →
          </Link>
        </div>
      </section>

      {/* 03 — Research */}
      <section
        aria-labelledby="research-title"
        className="relative border-t border-line bg-surface/40 py-section"
      >
        <div className="container-page">
          <SectionHeader
            index="03"
            label="Research"
            id="research-title"
            title={
              <>
                Patterns in{' '}
                <span className="font-serif font-normal normal-case italic text-accent">time</span>
              </>
            }
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <p className="label-accent">Research internship · VECC, DAE · Summer 2026</p>
              <p className="mt-4 text-lg leading-relaxed text-fg/85">
                A NARX-based time-series modelling pipeline built from 11 EPICS process-variable
                datasets: JSON extraction, temporal alignment and merging into a unified dataset of
                roughly 1.47 million rows, followed by single-target and multi-target studies with
                scheduled-sampling recursive training.
              </p>
              <p className="mt-4 text-sm text-muted">
                Only details cleared for public disclosure are shown. No operational parameters,
                internal infrastructure or unpublished findings.
              </p>
              <Link href="/research" className="btn-ghost mt-8">
                Research overview →
              </Link>
            </Reveal>
            <Reveal className="lg:col-span-7" delay={120}>
              <NarxDiagram />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 04 — Proof of work */}
      <section
        aria-labelledby="proof-title"
        className="container-page border-t border-line py-section"
      >
        <SectionHeader
          index="04"
          label="Achievements"
          id="proof-title"
          title="Proof of work"
          intro={
            achievements.length
              ? `${achievements.length} published record${achievements.length === 1 ? '' : 's'} — certificates, recognition and leadership, each shown with its original document where approved.`
              : 'Certificates, recognition and leadership — published as each record is reviewed.'
          }
        />
        {featuredAchievements.length ? (
          <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featuredAchievements.map((a, i) => (
              <Reveal key={a.slug} delay={i * 90}>
                <AchievementCard a={a} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-16">
            <EmptyState title="The archive is being curated">
              Records are published once their documents are reviewed.
            </EmptyState>
          </div>
        )}
        <div className="mt-14 flex justify-end">
          <Link href="/achievements" className="btn-ghost">
            Open the archive →
          </Link>
        </div>
      </section>

      {/* 05 — Notes */}
      <section
        aria-labelledby="notes-title"
        className="container-page border-t border-line py-section"
      >
        <SectionHeader
          index="05"
          label="Notes for juniors"
          id="notes-title"
          title={
            <>
              Learn it{' '}
              <span className="font-serif font-normal normal-case italic text-accent">
                properly
              </span>
            </>
          }
          intro="Mathematics, computer science and machine learning explained from first principles — with equations, code and diagrams."
        />
        <div className="mt-14 border-t border-line">
          {latestPosts.length ? (
            latestPosts.map((p) => <PostRow key={p.slug} post={p} />)
          ) : (
            <div className="pt-10">
              <EmptyState title="First notes are in review">
                Articles appear here once published.
              </EmptyState>
            </div>
          )}
        </div>
        <div className="mt-10 flex justify-end">
          <Link href="/blog" className="btn-ghost">
            All notes →
          </Link>
        </div>
      </section>

      {/* 06 — Playground */}
      <section aria-labelledby="play-title" className="border-t border-line">
        <div className="container-page grid items-center gap-10 py-section lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-mono-xs text-accent">06</span>
              <span className="section-index">Playground</span>
            </div>
            <h2
              id="play-title"
              className="mt-5 font-display text-display-md font-semibold uppercase"
              style={{ fontStretch: '78%' }}
            >
              Touch the{' '}
              <span className="font-serif font-normal normal-case italic text-accent">
                mathematics
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-fg/80">
              Parametric curves, gradient descent, matrix transformations, Fourier series and a tiny
              neural network — interactive, explained, and safe to break.
            </p>
            <Link href="/playground" className="btn-primary mt-8">
              Enter the playground →
            </Link>
          </div>
          <MiniLissajous />
        </div>
      </section>

      {/* 07 — Contact */}
      <section
        aria-labelledby="contact-title"
        className="relative overflow-hidden border-t border-line"
      >
        <div className="container-page py-section">
          <p className="section-index">
            <span className="mr-3 font-mono text-accent">07</span>Contact
          </p>
          <h2
            id="contact-title"
            className="mt-6 font-display text-display-lg font-bold uppercase"
            style={{ fontStretch: '68%' }}
          >
            Let&rsquo;s build <br />
            <span className="font-serif font-normal normal-case italic text-accent">
              something precise.
            </span>
          </h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary">
              Contact me →
            </Link>
            {profile.cvUrl && (
              <a href={profile.cvUrl} className="btn-ghost">
                Download CV
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
