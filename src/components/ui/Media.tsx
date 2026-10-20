import { cn } from '@/lib/utils';
import type { PublicImage } from '@/server/repos/public';

/**
 * Responsive image built from server-generated variants (560w thumb, 1800w display).
 * Width/height attributes reserve space to prevent layout shift.
 * `fit="contain"` preserves entire documents (certificates are never cropped or stretched).
 */
export function MediaImage({
  image,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  className,
  imgClassName,
  fit = 'cover',
  priority = false,
  ratio,
}: {
  image: PublicImage;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  fit?: 'cover' | 'contain';
  priority?: boolean;
  /** Force an aspect ratio box (e.g. "4 / 3"); defaults to the image's intrinsic ratio. */
  ratio?: string;
}) {
  const aspect =
    ratio ?? (image.width && image.height ? `${image.width} / ${image.height}` : '4 / 3');
  return (
    <div
      className={cn('relative overflow-hidden bg-surface', className)}
      style={{ aspectRatio: aspect }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- variants are pre-optimised by the media pipeline */}
      <img
        src={image.display}
        srcSet={image.kind === 'IMAGE' ? `${image.thumb} 560w, ${image.display} 1800w` : undefined}
        sizes={sizes}
        alt={image.alt}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={cn(
          'absolute inset-0 h-full w-full',
          fit === 'contain' ? 'object-contain' : 'object-cover',
          imgClassName,
        )}
      />
    </div>
  );
}

/**
 * Clearly-labelled placeholder used when no approved image exists.
 * It is procedural artwork, never an imitation of a certificate.
 */
export function Placeholder({
  label = 'No image uploaded',
  seed = 'lab',
  ratio = '4 / 3',
  className,
  variant = 'grid',
}: {
  label?: string;
  seed?: string;
  ratio?: string;
  className?: string;
  variant?: 'grid' | 'document';
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = 1 + (h % 5);
  const b = 2 + ((h >> 3) % 4);
  const phase = ((h >> 6) % 100) / 100;
  const points = Array.from({ length: 121 }, (_, i) => {
    const t = (i / 120) * Math.PI * 2;
    const x = 50 + 34 * Math.sin(a * t + phase * Math.PI);
    const y = 37.5 + 26 * Math.sin(b * t);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface',
        variant === 'grid' && 'grid-lines',
        className,
      )}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={`Placeholder — ${label}`}
    >
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {variant === 'document' && (
          <rect
            x="14"
            y="8"
            width="72"
            height="59"
            fill="none"
            stroke="rgb(var(--c-line))"
            strokeDasharray="1.5 1.5"
            strokeWidth="0.5"
          />
        )}
        <polyline
          points={points}
          fill="none"
          stroke="rgb(var(--c-muted) / 0.45)"
          strokeWidth="0.4"
        />
        <circle cx="50" cy="37.5" r="1.2" fill="rgb(var(--c-signal))" />
      </svg>
      <span className="absolute bottom-3 left-3 rounded-xs bg-bg/80 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
    </div>
  );
}
