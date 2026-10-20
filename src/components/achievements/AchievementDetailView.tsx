import Link from 'next/link';
import type { AchievementDetail } from '@/server/repos/public';
import type { RenderedMarkdown } from '@/lib/markdown';
import { formatDate } from '@/lib/utils';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  Breadcrumbs,
  ExternalLink,
  JsonLd,
  Pill,
  PrevNext,
  Prose,
} from '@/components/ui/primitives';
import { DocumentViewer } from '@/components/achievements/DocumentViewer';
import { Gallery } from '@/components/ui/Gallery';
import { achievementDate } from '@/components/achievements/AchievementCard';

/** Achievement detail layout shared by the public page and the admin draft preview. */
export function AchievementDetailView({
  a,
  context,
  learned,
  banner,
}: {
  a: AchievementDetail;
  context: RenderedMarkdown | null;
  learned: RenderedMarkdown | null;
  banner?: React.ReactNode;
}) {
  return (
    <article>
      {banner}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Achievements', path: '/achievements' },
          { name: a.title, path: `/achievements/${a.slug}` },
        ])}
      />
      <header className="container-page pb-10 pt-[calc(var(--header-h)+3rem)] md:pt-[calc(var(--header-h)+5rem)]">
        <Breadcrumbs
          items={[{ label: 'Achievements', href: '/achievements' }, { label: a.title }]}
        />
        <p className="label-accent mt-8">{a.categoryLabel}</p>
        <h1
          className="mt-4 max-w-5xl font-display text-display-md font-bold uppercase"
          style={{ fontStretch: '72%' }}
        >
          {a.title}
        </h1>
        <p className="mt-4 font-serif text-2xl italic text-fg/85">{a.issuer}</p>
      </header>

      <div className="container-page grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DocumentViewer
            title={a.title}
            preview={a.preview}
            document={a.document}
            photos={a.photos}
            hasCertificate={a.hasCertificate}
            slug={a.slug}
          />
        </div>

        <aside className="lg:col-span-5">
          <dl className="divide-y divide-line border-y border-line">
            <Row label="Issued by">{a.issuer}</Row>
            {achievementDate(a) && <Row label="Date">{achievementDate(a)}</Row>}
            {a.expirationDate && <Row label="Expires">{formatDate(a.expirationDate)}</Row>}
            <Row label="Category">{a.categoryLabel}</Row>
            {a.recipientName && <Row label="Recipient">{a.recipientName}</Row>}
            {a.credentialId && (
              <Row label="Credential ID">
                <span className="font-mono text-sm">{a.credentialId}</span>
              </Row>
            )}
            <Row label="Verification">
              {a.verificationUrl ? (
                <ExternalLink href={a.verificationUrl} className="link-underline text-accent">
                  Verify with issuer ↗
                </ExternalLink>
              ) : (
                <span className="text-muted">No public verification link</span>
              )}
              {a.verified && (
                <span className="ml-3 align-middle">
                  <Pill tone="accent">Owner-verified</Pill>
                </span>
              )}
            </Row>
          </dl>
          {a.summary && <p className="mt-8 text-lg leading-relaxed text-fg/85">{a.summary}</p>}
          {a.skills.length > 0 && (
            <div className="mt-8">
              <h2 className="label mb-3">Skills &amp; subjects</h2>
              <ul className="flex flex-wrap gap-2">
                {a.skills.map((s) => (
                  <li key={s} className="chip pointer-events-none">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {(context || learned) && (
        <div className="container-page mt-20 grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-1">
            {context && (
              <section aria-labelledby="context-h" className="mb-14">
                <h2
                  id="context-h"
                  className="font-display text-3xl font-semibold uppercase"
                  style={{ fontStretch: '80%' }}
                >
                  Context
                </h2>
                <Prose html={context.html} className="mt-5" />
              </section>
            )}
            {learned && (
              <section aria-labelledby="learned-h">
                <h2
                  id="learned-h"
                  className="font-display text-3xl font-semibold uppercase"
                  style={{ fontStretch: '80%' }}
                >
                  What I learned
                </h2>
                <Prose html={learned.html} className="mt-5" />
              </section>
            )}
          </div>
        </div>
      )}

      {a.gallery.length > 0 && (
        <section aria-labelledby="gallery-h" className="container-page mt-20">
          <h2
            id="gallery-h"
            className="mb-6 font-display text-3xl font-semibold uppercase"
            style={{ fontStretch: '80%' }}
          >
            Gallery
          </h2>
          <Gallery images={a.gallery} label={a.title} />
        </section>
      )}

      {(a.projects.length > 0 || a.posts.length > 0) && (
        <section
          aria-labelledby="related-h"
          className="container-page mt-20 border-t border-line pt-8"
        >
          <h2 id="related-h" className="label mb-6">
            Related work &amp; notes
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {a.projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/work/${p.slug}`} className="group block">
                  <span className="label">Project</span>
                  <span className="mt-1 block font-display text-xl font-semibold group-hover:text-accent">
                    {p.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted">{p.summary}</span>
                </Link>
              </li>
            ))}
            {a.posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <span className="label">Note</span>
                  <span className="mt-1 block font-display text-xl font-semibold group-hover:text-accent">
                    {p.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted">{p.excerpt}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="container-page mt-16 flex flex-col gap-8">
        <PrevNext base="/achievements" prev={a.prev} next={a.next} />
        <Link href="/achievements" className="label hover:text-fg">
          ← Back to the archive
        </Link>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
      <dt className="label pt-0.5">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
