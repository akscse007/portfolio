'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin, type UploadedMedia } from './AdminContext';
import { Uploader } from './Uploader';
import { cn, formatBytes } from '@/lib/utils';

type Kind = 'IMAGE' | 'PDF' | 'VIDEO' | 'DOCUMENT';

export function MediaThumb({
  media,
  className,
}: {
  media: Pick<UploadedMedia, 'id' | 'kind' | 'alt' | 'originalName' | 'mimeType'>;
  className?: string;
}) {
  if (media.kind === 'IMAGE')
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails are pre-sized variants
      <img
        src={`/media/${media.id}?v=thumb`}
        alt={media.alt || media.originalName}
        className={cn('h-full w-full object-contain', className)}
        loading="lazy"
      />
    );
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-1 bg-surface p-2 text-center',
        className,
      )}
    >
      <span className="font-mono text-xs uppercase text-accent">
        {media.kind === 'DOCUMENT' ? 'VTT' : media.kind}
      </span>
      <span className="line-clamp-2 break-all text-[0.65rem] text-muted">{media.originalName}</span>
    </div>
  );
}

/**
 * Modal media library picker with search, kind filter and inline upload.
 * Calls onSelect with the chosen asset (or several with `multiple`).
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  kinds = ['IMAGE'],
  multiple = false,
  title = 'Choose media',
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: UploadedMedia[]) => void;
  kinds?: Kind[];
  multiple?: boolean;
  title?: string;
}) {
  const { api } = useAdmin();
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>(kinds[0]!);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: UploadedMedia[] }>(
        `/api/admin/media?kind=${kind}&q=${encodeURIComponent(q)}&take=60`,
      );
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [api, kind, q]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setSelected([]);
      void load();
    }
    if (!open && d.open) d.close();
  }, [open, load]);

  const toggle = (id: string) =>
    setSelected((s) =>
      multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id],
    );

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="picker-title"
      className="h-[min(90vh,52rem)] w-[min(64rem,calc(100vw-1rem))] rounded-sm border border-line bg-elevated p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <h2 id="picker-title" className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_16rem]">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {kinds.length > 1 &&
                kinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="chip"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                  >
                    {k.toLowerCase()}
                  </button>
                ))}
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void load();
                }}
              >
                <label htmlFor="picker-q" className="sr-only">
                  Search media
                </label>
                <input
                  id="picker-q"
                  className="input"
                  placeholder="Search by name or alt text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn-ghost btn-sm" type="submit">
                  Search
                </button>
              </form>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-sm" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                No files yet — upload one on the right.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-4">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={selected.includes(m.id)}
                      className={cn(
                        'block w-full overflow-hidden rounded-sm border text-left',
                        selected.includes(m.id)
                          ? 'border-signal ring-2 ring-signal'
                          : 'border-line hover:border-fg',
                      )}
                    >
                      <span className="block aspect-square bg-bg">
                        <MediaThumb media={m} />
                      </span>
                      <span className="block truncate px-2 py-1 text-[0.65rem] text-muted">
                        {m.originalName} · {formatBytes(m.sizeBytes)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Uploader
              accept={kinds}
              compact
              onUploaded={(media) => {
                setItems((xs) => [media, ...xs]);
                setSelected((s) => (multiple ? [...s, media.id] : [media.id]));
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <span className="text-xs text-muted">{selected.length} selected</span>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!selected.length}
            onClick={() => {
              onSelect(items.filter((m) => selected.includes(m.id)));
              onClose();
            }}
          >
            Use selected
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A single media slot: shows the current file and opens the picker. */
export function MediaSlot({
  label,
  value,
  onChange,
  kinds = ['IMAGE'],
  hint,
}: {
  label: string;
  value: Pick<UploadedMedia, 'id' | 'kind' | 'alt' | 'originalName' | 'mimeType'> | null;
  onChange: (m: UploadedMedia | null) => void;
  kinds?: Kind[];
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <div className="flex items-center gap-4 rounded-sm border border-line p-3">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xs bg-bg">
          {value ? (
            <MediaThumb media={value} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">None</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{value?.originalName ?? 'No file selected'}</p>
          {hint && <p className="text-xs text-muted">{hint}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
              {value ? 'Replace' : 'Choose'}
            </button>
            {value && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        kinds={kinds}
        onSelect={(items) => onChange(items[0] ?? null)}
      />
    </div>
  );
}
