import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject } from '@/server/repos/public';
import { renderMarkdown } from '@/lib/markdown';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, ExternalLink, JsonLd, PrevNext, Prose } from '@/components/ui/primitives';
import { MediaImage } from '@/components/ui/Media';
import { Gallery } from '@/components/ui/Gallery';
import { ProjectStage } from '@/components/work/ProjectStage';
import { Reveal } from '@/components/motion/Reveal';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: 'Project not found', robots: { index: false } };
  return pageMetadata({
    title: p.seoTitle || `${p.title} — Case study`,
    description: p.seoDescription || p.summary,
    path: `/work/${p.slug}`,
    image: p.cover?.display ?? `/work/${p.slug}/opengraph-image`,
    type: 'article',
    publishedTime: p.publishedAt,
    modifiedTime: p.updatedAt,
  });
}

const SECTIONS = [
  ['problem', 'Problem & motivation'],
  ['solution', 'Solution'],
  ['architecture', 'Architecture'],
  ['contribution', 'My role & contribution'],
  ['decisions', 'Design decisions & trade-offs'],
  ['challenges', 'Challenges'],
  ['lessons', 'Lessons & notes'],
] as const;

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();

  const sections = (
    await Promise.all(
      SECTIONS.map(async ([key, label]) => {
        const md = p[key];
        return md?.trim() ? { key, label, html: (await renderMarkdown(md)).html } : null;
      }),
    )
  ).filter(
    (
      s,
    ): s is {
      key: (typeof SECTIONS)[number][0];
      label: (typeof SECTIONS)[number][1];
      html: string;
    } => Boolean(s),
  );

  return (
    <article>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/work' },
          { name: p.title, path: `/work/${p.slug}` },
        ])}
      />
      <header className="container-page pb-12 pt-[calc(var(--header-h)+3rem)] md:pt-[calc(var(--header-h)+5rem)]">
        <Breadcrumbs items={[{ label: 'Work', href: '/work' }, { label: p.title }]} />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="label-accent">{p.category}</span>
          <ProjectStage stage={p.stage} note={p.stageNote} />
        </div>
        <h1
          className="mt-5 font-display text-display-lg font-bold uppercase"
          style={{ fontStretch: '70%' }}
        >
          {p.title}
        </h1>
        {p.subtitle && (
          <p className="mt-4 max-w-3xl font-serif text-2xl italic text-fg/85 md:text-3xl">
            {p.subtitle}
          </p>
        )}
        <dl className="mt-10 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="label">Role</dt>
            <dd className="mt-1">{p.role || '—'}</dd>
          </div>
          <div>
            <dt className="label">Period</dt>
            <dd className="mt-1">{p.period || '—'}</dd>
          </div>
          <div>
            <dt className="label">Status</dt>
            <dd className="mt-1">
              <ProjectStage stage={p.stage} />
            </dd>
          </div>
          <div>
            <dt className="label">Links</dt>
            <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {p.liveUrl && (
                <ExternalLink href={p.liveUrl} className="link-underline text-accent">
                  Live site ↗
                </ExternalLink>
              )}
              {p.repoUrl && (
                <ExternalLink href={p.repoUrl} className="link-underline text-accent">
                  Repository ↗
                </ExternalLink>
              )}
              {!p.liveUrl && !p.repoUrl && <span className="text-muted">No public link</span>}
            </dd>
          </div>
        </dl>
      </header>

      {p.cover && (
        <div className="container-page">
          <MediaImage
            image={p.cover}
            priority
            className="rounded-sm border border-line"
            sizes="100vw"
            ratio="16 / 8"
          />
        </div>
      )}

      {p.previewVideo && (
        <div className="container-page mt-8">
          <div className="overflow-hidden rounded-sm border border-line">
            <video
              controls
              preload="metadata"
              playsInline
              className="w-full"
              poster={p.cover?.display}
            >
              <source src={p.previewVideo.original} type={p.previewVideo.mimeType} />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      <div className="container-page mt-16 grid gap-14 lg:grid-cols-12">
        <aside className="lg:col-span-4 lg:order-2">
          <div className="space-y-10 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <p className="text-lg leading-relaxed text-fg/85">{p.summary}</p>
            {p.skills.length > 0 && (
              <div>
                <h2 className="label mb-3">Technologies</h2>
                <ul className="flex flex-wrap gap-2">
                  {p.skills.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/work?skill=${s.slug}`} className="chip">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sections.length > 1 && (
              <nav aria-label="Case study sections">
                <h2 className="label mb-3">Contents</h2>
                <ol className="space-y-1 text-sm">
                  {sections.map((s, i) => (
                    <li key={s.key}>
                      <a
                        href={`#${s.key}`}
                        className="inline-flex min-h-9 items-center gap-3 text-muted hover:text-fg"
                      >
                        <span className="font-mono text-mono-xs text-accent">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </aside>

        <div className="lg:col-span-8 lg:order-1">
          {sections.map((s, i) => (
            <Reveal as="section" key={s.key} className="mb-16" aria-labelledby={`${s.key}-h`}>
              <div id={s.key} className="scroll-mt-28 border-t border-line pt-6">
                <p className="font-mono text-mono-xs text-accent">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h2
                  id={`${s.key}-h`}
                  className="mt-2 font-display text-3xl font-semibold uppercase"
                  style={{ fontStretch: '80%' }}
                >
                  {s.label}
                </h2>
                <Prose html={s.html} className="mt-6" />
              </div>
            </Reveal>
          ))}

          {p.gallery.length > 0 && (
            <section aria-labelledby="gallery-h" className="mb-16">
              <h2
                id="gallery-h"
                className="mb-6 font-display text-3xl font-semibold uppercase"
                style={{ fontStretch: '80%' }}
              >
                Screens & media
              </h2>
              <Gallery images={p.gallery} label={p.title} />
            </section>
          )}

          {(p.achievements.length > 0 || p.posts.length > 0 || p.videos.length > 0) && (
            <section aria-labelledby="related-h" className="mb-16 border-t border-line pt-6">
              <h2 id="related-h" className="label mb-6">
                Related
              </h2>
              <div className="grid gap-8 sm:grid-cols-3">
                {p.achievements.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Achievements</h3>
                    <ul className="space-y-1 text-sm">
                      {p.achievements.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={`/achievements/${a.slug}`}
                            className="text-muted hover:text-accent"
                          >
                            {a.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.posts.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Notes</h3>
                    <ul className="space-y-1 text-sm">
                      {p.posts.map((x) => (
                        <li key={x.slug}>
                          <Link href={`/blog/${x.slug}`} className="text-muted hover:text-accent">
                            {x.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.videos.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Demos</h3>
                    <ul className="space-y-1 text-sm">
                      {p.videos.map((v) => (
                        <li key={v.slug}>
                          <Link href={`/demos#${v.slug}`} className="text-muted hover:text-accent">
                            {v.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="container-page mt-8">
        <PrevNext base="/work" prev={p.prev} next={p.next} />
      </div>
    </article>
  );
}
