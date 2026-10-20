'use client';

import { useState } from 'react';
import type { PublicImage } from '@/server/repos/public';
import { MediaImage } from './Media';
import { Lightbox, type LightboxItem } from './Lightbox';

/** Accessible screenshot / photo gallery with a full-screen viewer. */
export function Gallery({ images, label = 'Gallery' }: { images: PublicImage[]; label?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const items: LightboxItem[] = images.map((img) => ({
    id: img.id,
    kind: img.kind === 'PDF' ? 'PDF' : 'IMAGE',
    src: img.display,
    original: img.original,
    alt: img.alt,
    caption: img.caption,
    width: img.width,
    height: img.height,
  }));
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {images.map((img, i) => (
          <li
            key={img.id}
            className={i === 0 && images.length % 2 === 1 ? 'sm:col-span-2' : undefined}
          >
            <figure>
              <button
                type="button"
                className="block w-full cursor-zoom-in overflow-hidden rounded-sm border border-line"
                onClick={() => setIndex(i)}
                aria-label={`Open image ${i + 1} of ${images.length}: ${img.alt}`}
              >
                <MediaImage image={img} sizes="(min-width: 1024px) 50vw, 100vw" />
              </button>
              {img.caption && <figcaption className="annot mt-2">{img.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      <Lightbox
        items={items}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        label={label}
      />
    </>
  );
}
