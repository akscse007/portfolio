import type { Metadata } from 'next';
import { getProfile, getSettings } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/ui/primitives';
import { ContactForm } from '@/components/contact/ContactForm';
import { KolkataClock } from '@/components/layout/KolkataClock';

export const metadata: Metadata = pageMetadata({
  title: 'Contact',
  description: 'Get in touch with Akash Roy about projects, research or collaboration.',
  path: '/contact',
});

export default async function ContactPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const enabled = settings?.contactEnabled ?? true;
  return (
    <>
      <PageHero
        index="08"
        label="Contact"
        title={
          <>
            Say <span className="font-serif font-normal normal-case italic text-accent">hello</span>
          </>
        }
        intro="Projects, research collaborations, teaching or a question about one of my notes — I read every message."
      />
      <section className="container-page grid gap-14 pb-section lg:grid-cols-12">
        <div className="lg:col-span-7">
          {enabled ? (
            <ContactForm />
          ) : (
            <p className="rounded-sm border border-line p-6 text-muted">
              The contact form is currently closed.
              {profile?.email ? ' You can still reach me by email.' : ''}
            </p>
          )}
        </div>
        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          {profile?.availability && (
            <p className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-mono-xs uppercase">
              <span className="h-2 w-2 rounded-full bg-signal" aria-hidden /> {profile.availability}
            </p>
          )}
          <dl className="divide-y divide-line border-y border-line">
            {profile?.email && (
              <div className="py-4">
                <dt className="label">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${profile.email}`} className="link-underline break-all">
                    {profile.email}
                  </a>
                </dd>
              </div>
            )}
            <div className="py-4">
              <dt className="label">Location</dt>
              <dd className="mt-1">{profile?.location}</dd>
            </div>
            {profile?.showClock && (
              <div className="py-4">
                <dt className="label">Local time</dt>
                <dd className="mt-1 font-mono">
                  <KolkataClock timezone={profile.timezone} />
                </dd>
              </div>
            )}
            <div className="py-4">
              <dt className="label">Elsewhere</dt>
              <dd className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                {profile?.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="link-underline"
                  >
                    GitHub ↗
                  </a>
                )}
                {profile?.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="link-underline"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </>
  );
}
