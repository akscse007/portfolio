'use client';

import { useState } from 'react';
import type { PublicImage } from '@/server/repos/public';
import { MediaImage, Placeholder } from '@/components/ui/Media';
import { Lightbox, type LightboxItem } from '@/components/ui/Lightbox';

/**
 * Certificate stage on the detail page: the approved preview shown whole on a paper mat,
 * with full-screen viewing, and (only if the owner made it public) the original document.
 */
export function DocumentViewer({
  title,
  preview,
  document,
  photos,
  hasCertificate,
  slug,
}: {
  title: string;
  preview: PublicImage | null;
  document: PublicImage | null;
  photos: PublicImage[];
  hasCertificate: boolean;
  slug: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const items: LightboxItem[] = [];
  if (preview)
    items.push({
      id: preview.id,
      kind: 'IMAGE',
      src: preview.display,
      original: document?.kind === 'IMAGE' ? document.original : null,
      alt: preview.alt || `${title} — certificate`,
      title,
      caption: preview.caption,
      width: preview.width,
      height: preview.height,
    });
  if (document?.kind === 'PDF')
    items.push({
      id: document.id,
      kind: 'PDF',
      src: document.original,
      alt: document.alt || `${title} — PDF`,
      title: `${title} (PDF)`,
    });
  photos.forEach((p) =>
    items.push({
      id: p.id,
      kind: 'IMAGE',
      src: p.display,
      original: p.original,
      alt: p.alt,
      title,
      caption: p.caption,
      width: p.width,
      height: p.height,
    }),
  );

  const main = preview ?? photos[0] ?? null;
  const mainIsDoc = Boolean(preview);

  return (
    <div>
      <div className={mainIsDoc ? 'rounded-xs bg-elevated p-4 shadow-doc sm:p-8' : ''}>
        {main ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            onClick={() => setIndex(0)}
            aria-label={`View ${mainIsDoc ? 'certificate' : 'photo'} full screen`}
            data-testid="open-lightbox"
          >
            <MediaImage
              image={main}
              fit={mainIsDoc ? 'contain' : 'cover'}
              className={mainIsDoc ? 'bg-transparent' : 'rounded-sm'}
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
            />
          </button>
        ) : (
          <Placeholder
            variant="document"
            seed={slug}
            ratio="1.414 / 1"
            label={
              hasCertificate
                ? 'Certificate preview not yet approved for publication'
                : 'No certificate image uploaded'
            }
          />
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {main && (
          <button type="button" className="btn-primary" onClick={() => setIndex(0)}>
            {mainIsDoc ? 'View certificate' : 'View photo'}
          </button>
        )}
        {document?.kind === 'PDF' && (
          <>
            <a href={document.original} target="_blank" rel="noopener" className="btn-ghost">
              Open PDF
            </a>
            <a href={`${document.original}?download=1`} className="btn-ghost">
              Download PDF
            </a>
          </>
        )}
      </div>
      <Lightbox
        items={items}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        label="Certificate viewer"
      />
    </div>
  );
}
