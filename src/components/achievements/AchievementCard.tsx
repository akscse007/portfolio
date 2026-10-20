import Link from 'next/link';
import type { PublicAchievement } from '@/server/repos/public';
import { MediaImage, Placeholder } from '@/components/ui/Media';
import { Pill } from '@/components/ui/primitives';
import { formatDate, cn } from '@/lib/utils';

export function achievementDate(a: Pick<PublicAchievement, 'issueDate' | 'dateLabel'>) {
  return a.dateLabel || (a.issueDate ? formatDate(a.issueDate) : '');
}

/** Document-style card: previews keep their full proportions (object-contain on a paper mat). */
export function AchievementCard({
  a,
  onOpen,
  className,
  headingLevel: H = 'h3',
}: {
  a: PublicAchievement;
  onOpen?: () => void;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}) {
  const isPhoto = !a.preview && a.photos.length > 0;
  const image = a.preview ?? a.photos[0] ?? null;
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div
        className={cn('relative', isPhoto ? '' : 'rounded-xs bg-elevated p-3 shadow-doc sm:p-4')}
      >
        {image && onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="relative z-10 block w-full cursor-zoom-in"
            aria-label={`View ${isPhoto ? 'photo' : 'certificate'} full screen: ${a.title}`}
            data-testid="open-lightbox"
          >
            <MediaImage
              image={image}
              fit={isPhoto ? 'cover' : 'contain'}
              ratio={isPhoto ? '4 / 3' : undefined}
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
              className={cn(isPhoto ? 'rounded-sm' : 'bg-transparent')}
              imgClassName="transition-transform duration-slow ease-out-expo group-hover:scale-[1.02]"
            />
          </button>
        ) : image ? (
          <MediaImage
            image={image}
            fit={isPhoto ? 'cover' : 'contain'}
            ratio={isPhoto ? '4 / 3' : undefined}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            className={cn(isPhoto ? 'rounded-sm' : 'bg-transparent')}
          />
        ) : (
          <Placeholder
            variant="document"
            seed={a.slug}
            ratio="1.414 / 1"
            label={a.hasCertificate ? 'Preview awaiting approval' : 'No certificate image'}
          />
        )}
        {a.featured && (
          <span className="absolute -top-2 right-3 rounded-full bg-signal px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-signal-fg">
            Featured
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        <p className="label flex flex-wrap items-center gap-x-2">
          <span>{a.categoryLabel}</span>
          {achievementDate(a) && (
            <>
              <span aria-hidden>·</span>
              <span>{achievementDate(a)}</span>
            </>
          )}
        </p>
        <H className="mt-2 font-display text-xl font-semibold leading-tight">
          <Link
            href={`/achievements/${a.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
          >
            {a.title}
          </Link>
        </H>
        <p className="mt-1 text-sm text-muted">{a.issuer}</p>
        {a.summary && <p className="mt-3 line-clamp-3 text-sm text-fg/75">{a.summary}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {a.verified && <Pill tone="accent">Verified</Pill>}
          {a.verificationUrl && <Pill tone="blue">Credential link</Pill>}
        </div>
      </div>
    </article>
  );
}
