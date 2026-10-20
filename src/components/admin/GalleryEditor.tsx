'use client';

import { useState } from 'react';
import type { UploadedMedia } from './AdminContext';
import { MediaPicker, MediaThumb } from './MediaPicker';

export type GalleryItem = Pick<UploadedMedia, 'id' | 'kind' | 'alt' | 'originalName' | 'mimeType'>;

/** Ordered list of media with add / remove / reorder (keyboard-accessible buttons, no drag required). */
export function GalleryEditor({
  label,
  items,
  onChange,
  kinds = ['IMAGE'],
}: {
  label: string;
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  kinds?: ('IMAGE' | 'PDF' | 'VIDEO')[];
}) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="label">{label}</p>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
          Add media
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line p-4 text-center text-xs text-muted">
          No media yet.
        </p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m, i) => (
            <li key={m.id} className="rounded-sm border border-line">
              <div className="aspect-[4/3] bg-bg">
                <MediaThumb media={m} />
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <span className="font-mono text-[0.6rem] text-muted">#{i + 1}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost btn-sm min-h-8 px-2"
                    aria-label="Move earlier"
                    onClick={() => move(i, -1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm min-h-8 px-2"
                    aria-label="Move later"
                    onClick={() => move(i, 1)}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm min-h-8 px-2 text-danger"
                    aria-label={`Remove ${m.originalName}`}
                    onClick={() => onChange(items.filter((x) => x.id !== m.id))}
                  >
                    ×
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        kinds={kinds}
        multiple
        onSelect={(sel) =>
          onChange([...items, ...sel.filter((s) => !items.some((x) => x.id === s.id))])
        }
      />
    </div>
  );
}
