'use client';

import { useRef, useState } from 'react';
import { errorMessage, useAdmin, type UploadedMedia } from './AdminContext';
import { renderPdfFirstPage } from './pdfPreview';
import { cn, formatBytes } from '@/lib/utils';

const ACCEPT_ATTR: Record<string, string> = {
  IMAGE: 'image/jpeg,image/png,image/webp,image/gif,image/avif',
  PDF: 'application/pdf',
  VIDEO: 'video/mp4,video/webm',
  DOCUMENT: 'text/vtt,.vtt',
};
const LIMIT_MB: Record<string, number> = { IMAGE: 15, PDF: 20, VIDEO: 200, DOCUMENT: 2 };

type Job = {
  name: string;
  size: number;
  pct: number;
  state: 'uploading' | 'done' | 'error';
  error?: string;
};

function guessKind(file: File) {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.name.toLowerCase().endsWith('.vtt')) return 'DOCUMENT';
  return null;
}

/**
 * Drop zone with client-side pre-checks, per-file progress and errors.
 * The server re-validates type (magic bytes), size and dimensions.
 * PDFs automatically get a first-page image preview (stored as a separate, private derivative).
 */
export function Uploader({
  accept = ['IMAGE', 'PDF'],
  multiple = true,
  onUploaded,
  label = 'Drop files here or browse',
  compact,
}: {
  accept?: ('IMAGE' | 'PDF' | 'VIDEO' | 'DOCUMENT')[];
  multiple?: boolean;
  onUploaded: (media: UploadedMedia, extra?: { preview?: UploadedMedia }) => void;
  label?: string;
  compact?: boolean;
}) {
  const { upload, toast } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const counter = useRef(0);

  const handle = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const kind = guessKind(file);
      const idx = counter.current++;
      const update = (patch: Partial<Job>) =>
        setJobs((js) => js.map((j, i) => (i === idx ? { ...j, ...patch } : j)));
      setJobs((js) => [...js, { name: file.name, size: file.size, pct: 0, state: 'uploading' }]);
      if (!kind || !accept.includes(kind as never)) {
        update({
          state: 'error',
          error: `Not accepted here (allowed: ${accept.join(', ').toLowerCase()})`,
        });
        continue;
      }
      if (file.size > LIMIT_MB[kind]! * 1024 * 1024) {
        update({ state: 'error', error: `Larger than ${LIMIT_MB[kind]} MB` });
        continue;
      }
      try {
        const media = await upload(file, { accept, onProgress: (pct) => update({ pct }) });
        let preview: UploadedMedia | undefined;
        if (media.kind === 'PDF') {
          const png = await renderPdfFirstPage(file);
          if (png) {
            const named = Object.assign(png, {
              name: file.name.replace(/\.pdf$/i, '') + '-page1.png',
            });
            preview = await upload(named, {
              accept: ['IMAGE'],
              derivedFromId: media.id,
              alt: media.alt,
            });
          }
        }
        update({ state: 'done', pct: 100 });
        onUploaded(media, { preview });
      } catch (err) {
        update({ state: 'error', error: errorMessage(err) });
        toast(`${file.name}: ${errorMessage(err)}`, 'error');
      }
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) void handle(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed text-center transition-colors',
          compact ? 'px-4 py-5' : 'px-6 py-10',
          over ? 'border-accent bg-accent/5' : 'border-line',
        )}
      >
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted">
          {accept.map((k) => `${k.toLowerCase()} ≤ ${LIMIT_MB[k]} MB`).join(' · ')}
        </p>
        <button
          type="button"
          className="btn-ghost btn-sm mt-1"
          onClick={() => input.current?.click()}
        >
          Choose file{multiple ? 's' : ''}
        </button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept.map((k) => ACCEPT_ATTR[k]).join(',')}
          onChange={(e) => {
            if (e.target.files?.length) void handle(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Uploads">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-sm border border-line px-3 py-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="truncate">{j.name}</span>
                <span className="shrink-0 text-muted">
                  {formatBytes(j.size)} ·{' '}
                  {j.state === 'error' ? 'failed' : j.state === 'done' ? 'done' : `${j.pct}%`}
                </span>
              </div>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuenow={j.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress for ${j.name}`}
              >
                <div
                  className={cn(
                    'h-full transition-[width]',
                    j.state === 'error' ? 'bg-danger' : 'bg-signal',
                  )}
                  style={{ width: `${j.state === 'error' ? 100 : j.pct}%` }}
                />
              </div>
              {j.error && <p className="mt-1 text-danger">{j.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
