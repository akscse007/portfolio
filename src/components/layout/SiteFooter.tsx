import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { NAV } from '@/lib/nav';
import type { PublicProfile } from '@/server/repos/public';

export function SiteFooter({ profile, note }: { profile: PublicProfile; note?: string | null }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className="relative mt-section border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="container-page grid gap-12 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <LogoMark className="h-10 w-10" />
          <p className="mt-6 max-w-sm font-serif text-2xl italic leading-snug text-fg/90">
            From mathematical foundations to intelligent software.
          </p>
          <p className="label mt-6">{profile?.location ?? 'Kolkata, India'}</p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4">
          <p className="section-index mb-4">Index</p>
          <ul className="grid grid-cols-2 gap-x-6">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="inline-flex min-h-10 items-center text-sm text-muted hover:text-fg"
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/resume"
                className="inline-flex min-h-10 items-center text-sm text-muted hover:text-fg"
              >
                Résumé
              </Link>
            </li>
          </ul>
        </nav>
        <div className="md:col-span-3">
          <p className="section-index mb-4">Elsewhere</p>
          <ul className="space-y-1 text-sm">
            {profile?.githubUrl && (
              <li>
                <a
                  href={profile.githubUrl}
                  rel="me noopener noreferrer"
                  target="_blank"
                  className="inline-flex min-h-10 items-center text-muted hover:text-fg"
                >
                  GitHub ↗
                </a>
              </li>
            )}
            {profile?.linkedinUrl && (
              <li>
                <a
                  href={profile.linkedinUrl}
                  rel="me noopener noreferrer"
                  target="_blank"
                  className="inline-flex min-h-10 items-center text-muted hover:text-fg"
                >
                  LinkedIn ↗
                </a>
              </li>
            )}
            <li>
              <a
                href="/feed.xml"
                className="inline-flex min-h-10 items-center text-muted hover:text-fg"
              >
                RSS feed
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-page flex flex-col gap-3 border-t border-line py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {profile?.name ?? 'Akash Roy'}. {note}
        </p>
        <p className="flex gap-4">
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
          <span className="font-mono">I BUILD SYSTEMS. I STUDY PATTERNS.</span>
        </p>
      </div>
    </footer>
  );
}
