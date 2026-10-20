import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAchievements, getCv, getProfile, getProjects } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PrintButton } from '@/components/ui/PrintButton';

export const metadata: Metadata = pageMetadata({
  title: 'Résumé',
  description: 'Résumé of Akash Roy — AI Engineer and Full-Stack Developer.',
  path: '/resume',
});

/** A clean, printable résumé generated from the same database records as the site. */
export default async function ResumePage() {
  const [profile, cv, projects, achievements] = await Promise.all([
    getProfile(),
    getCv(),
    getProjects(),
    getAchievements(),
  ]);
  if (!profile) notFound();
  const groups = cv.skills.reduce<Record<string, string[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s.name);
    return acc;
  }, {});
  return (
    <div className="container-page pb-section pt-[calc(var(--header-h)+3rem)] print:p-0">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="section-index">Résumé · generated from live data</p>
        <div className="flex flex-wrap gap-3">
          {profile.cvUrl && (
            <a href={profile.cvUrl} className="btn-primary">
              Download owner-approved CV (PDF)
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-sm border border-line bg-elevated p-6 sm:p-12 print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="border-b border-line pb-6">
          <h1 className="font-display text-5xl font-bold uppercase" style={{ fontStretch: '72%' }}>
            {profile.name}
          </h1>
          <p className="mt-2 text-lg">{profile.headline}</p>
          <p className="mt-2 text-sm text-muted print:text-black">
            {profile.location}
            {profile.email && <> · {profile.email}</>}
            {profile.githubUrl && <> · {profile.githubUrl.replace(/^https?:\/\//, '')}</>}
            {profile.linkedinUrl && <> · {profile.linkedinUrl.replace(/^https?:\/\//, '')}</>}
          </p>
        </header>

        <Section title="Summary">
          <p>{profile.shortBio}</p>
        </Section>

        <Section title="Education">
          {cv.education.map((e) => (
            <div key={e.id} className="mb-3 flex flex-wrap justify-between gap-x-6">
              <div>
                <p className="font-semibold">{e.credential}</p>
                <p className="text-sm text-muted print:text-black">{e.institution}</p>
              </div>
              <p className="text-right text-sm">
                {e.period}
                {e.result && <span className="block font-mono">{e.result}</span>}
              </p>
            </div>
          ))}
        </Section>

        <Section title="Experience">
          {cv.experience.map((e) => (
            <div key={e.id} className="mb-5">
              <div className="flex flex-wrap justify-between gap-x-6">
                <p className="font-semibold">
                  {e.role} — {e.organization}
                </p>
                <p className="text-sm">{e.period}</p>
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {e.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        {projects.length > 0 && (
          <Section title="Selected projects">
            {projects.slice(0, 6).map((p) => (
              <div key={p.slug} className="mb-3">
                <p className="font-semibold">
                  <Link href={`/work/${p.slug}`} className="hover:text-accent print:text-black">
                    {p.title}
                  </Link>{' '}
                  <span className="font-normal text-muted print:text-black">— {p.subtitle}</span>
                </p>
                <p className="text-sm">{p.summary}</p>
              </div>
            ))}
          </Section>
        )}

        <Section title="Technical skills">
          <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
            {Object.entries(groups).map(([g, names]) => (
              <div key={g} className="contents">
                <dt className="font-semibold">{g}</dt>
                <dd>{names.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {achievements.length > 0 && (
          <Section title="Achievements & certifications">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {achievements.map((a) => (
                <li key={a.slug}>
                  {a.title} — {a.issuer}
                  {a.dateLabel ? ` (${a.dateLabel})` : ''}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-6 last:border-0 print:break-inside-avoid">
      <h2 className="label-accent mb-3 print:text-black">{title}</h2>
      {children}
    </section>
  );
}
