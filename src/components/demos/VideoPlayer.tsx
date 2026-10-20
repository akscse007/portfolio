'use client';

import { useState } from 'react';
import type { PublicVideo } from '@/server/repos/public';
import { MediaImage, Placeholder } from '@/components/ui/Media';
import { formatDuration } from '@/lib/utils';

/**
 * Privacy-conscious video: third-party players (YouTube via youtube-nocookie.com, Vimeo with dnt=1)
 * are only loaded after the visitor presses play. Uploaded MP4s use native controls with captions.
 */
export function VideoPlayer({ video }: { video: PublicVideo }) {
  const [active, setActive] = useState(false);
  const duration = formatDuration(video.durationSeconds);

  if (video.provider === 'UPLOAD' && video.file) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-sm border border-line bg-black">
        <video
          controls
          preload="none"
          playsInline
          poster={video.poster?.display}
          className="absolute inset-0 h-full w-full"
          aria-label={video.title}
        >
          <source src={video.file.original} type={video.file.mimeType} />
          {video.captions && (
            <track
              kind="captions"
              src={video.captions.original}
              srcLang="en"
              label="English"
              default
            />
          )}
          Your browser cannot play this video.{' '}
          <a href={video.file.original} className="underline">
            Download it instead
          </a>
          .
        </video>
      </div>
    );
  }

  const embed =
    video.provider === 'YOUTUBE' && video.externalId
      ? `https://www.youtube-nocookie.com/embed/${video.externalId}?autoplay=1&rel=0&modestbranding=1`
      : video.provider === 'VIMEO' && video.externalId
        ? `https://player.vimeo.com/video/${video.externalId}?autoplay=1&dnt=1`
        : null;

  if (!embed) {
    return (
      <Placeholder
        ratio="16 / 9"
        seed={video.slug}
        label="Video unavailable"
        className="rounded-sm border border-line"
      />
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-sm border border-line bg-black">
      {active ? (
        <iframe
          src={embed}
          title={video.title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 block h-full w-full text-left"
          aria-label={`Play video: ${video.title}${duration ? ` (${duration})` : ''}. Loads the ${video.provider === 'YOUTUBE' ? 'YouTube' : 'Vimeo'} player.`}
        >
          {video.poster ? (
            <MediaImage
              image={video.poster}
              ratio="16 / 9"
              className="absolute inset-0"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          ) : (
            <Placeholder
              ratio="16 / 9"
              seed={video.slug}
              label={`${video.provider === 'YOUTUBE' ? 'YouTube' : 'Vimeo'} video`}
              className="absolute inset-0"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-signal text-signal-fg shadow-lift transition-transform duration-base ease-out-expo group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-3 left-3 rounded-xs bg-bg/80 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-fg">
            Loads {video.provider === 'YOUTUBE' ? 'YouTube (no-cookie)' : 'Vimeo (do-not-track)'} on
            play
          </span>
          {duration && (
            <span className="absolute bottom-3 right-3 rounded-xs bg-bg/80 px-2 py-1 font-mono text-xs tabular-nums">
              {duration}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
