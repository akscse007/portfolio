'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { LibraryNoteCard } from '@/server/repos/public';
import { formatBytes } from '@/lib/utils';

function NoteCard({ note }: { note: LibraryNoteCard }) {
  return (
    <article className="group relative flex flex-col rounded-sm border border-line p-5 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="label flex flex-wrap items-center gap-x-2">
            <span>{note.subject}</span>
            <span aria-hidden>·</span>
            <span>{note.category}</span>
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold leading-tight group-hover:text-accent">
            {note.title}
          </h3>
          {note.description && (
            <p className="mt-2 line-clamp-2 text-sm text-fg/75">{note.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-xs bg-surface p-3">
          <span className="font-mono text-xs uppercase text-accent">PDF</span>
          <span className="mt-1 font-mono text-[0.65rem] text-muted">
            {formatBytes(note.media.sizeBytes)}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="chip text-xs">{note.academicLevel}</span>
        {note.tags.map((t) => (
          <span key={t.slug} className="chip text-xs">
            {t.name}
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <a
          href={note.media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn-sm"
          onClick={(e) => e.stopPropagation()}
        >
          Download PDF
        </a>
        <a
          href={note.media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost btn-sm"
          onClick={(e) => e.stopPropagation()}
        >
          Preview
        </a>
      </div>
    </article>
  );
}

export function LibraryIndex({ notes }: { notes: LibraryNoteCard[] }) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '');

  const subjects = useMemo(() => {
    const set = new Set(notes.map((n) => n.subject));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes;
    if (subject) list = list.filter((n) => n.subject === subject);
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          n.description.toLowerCase().includes(lower) ||
          n.tags.some((t) => t.name.toLowerCase().includes(lower)),
      );
    }
    return list;
  }, [notes, q, subject]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full max-w-xs rounded-sm border border-line bg-surface px-3 font-mono text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none sm:w-60"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="chip"
            aria-pressed={!subject}
            data-active={!subject}
            onClick={() => setSubject('')}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={subject === s}
              data-active={subject === s}
              onClick={() => setSubject(subject === s ? '' : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">No notes match your search.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
