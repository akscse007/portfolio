import type { Metadata } from 'next';
import Link from 'next/link';
import { getVideos } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { EmptyState, PageHero, Pill } from '@/components/ui/primitives';
import { VideoPlayer } from '@/components/demos/VideoPlayer';
import { formatDuration } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Demos — Video library',
  description: 'Video walkthroughs and demonstrations of projects by Akash Roy.',
  path: '/demos',
});

export default async function DemosPage() {
  const videos = await getVideos();
  const [lead, ...rest] = videos;
  return (
    <>
      <PageHero
        index="05"
        label="Demonstrations"
        title={
          <>
            See it{' '}
            <span className="font-serif font-normal normal-case italic text-accent">run</span>
          </>
        }
        intro="Recorded walkthroughs of real projects. External players load only when you press play."
      />
      <section className="container-page pb-section">
        {!lead ? (
          <EmptyState title="Demo recordings are on the way">
            Walkthrough videos will be published here as they are recorded. Meanwhile, explore the{' '}
            <Link href="/work" className="text-accent underline">
              case studies
            </Link>
            .
          </EmptyState>
        ) : (
          <>
            <article
              id={lead.slug}
              className="grid scroll-mt-28 gap-10 border-t border-line pt-10 lg:grid-cols-12"
            >
              <div className="lg:col-span-8">
                <VideoPlayer video={lead} />
              </div>
              <VideoMeta video={lead} large />
            </article>
            {rest.length > 0 && (
              <ul className="mt-20 grid gap-x-8 gap-y-16 border-t border-line pt-10 md:grid-cols-2">
                {rest.map((v) => (
                  <li key={v.slug} id={v.slug} className="scroll-mt-28">
                    <VideoPlayer video={v} />
                    <div className="mt-5">
                      <VideoMeta video={v} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}

function VideoMeta({
  video,
  large,
}: {
  video: Awaited<ReturnType<typeof getVideos>>[number];
  large?: boolean;
}) {
  const duration = formatDuration(video.durationSeconds);
  return (
    <div className={large ? 'lg:col-span-4' : ''}>
      <p className="label flex flex-wrap gap-x-3">
        <span>{video.category}</span>
        {duration && <span>{duration}</span>}
      </p>
      <h2
        className={`mt-2 font-display font-bold uppercase leading-none ${large ? 'text-4xl' : 'text-2xl'}`}
        style={{ fontStretch: '76%' }}
      >
        {video.title}
      </h2>
      {video.description && <p className="mt-3 text-fg/80">{video.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {video.project && (
          <Link href={`/work/${video.project.slug}`} className="chip">
            Project · {video.project.title}
          </Link>
        )}
        {video.captions && <Pill tone="blue">Captions</Pill>}
        {video.tags.map((t) => (
          <Pill key={t.slug}>{t.name}</Pill>
        ))}
      </div>
      {video.transcript && (
        <details className="mt-5 rounded-sm border border-line p-4">
          <summary className="label cursor-pointer">Transcript</summary>
          <p className="mt-3 whitespace-pre-line text-sm text-fg/80">{video.transcript}</p>
        </details>
      )}
    </div>
  );
}
