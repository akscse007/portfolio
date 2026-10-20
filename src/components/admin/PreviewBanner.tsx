import Link from 'next/link';

export function PreviewBanner({
  status,
  editHref,
  notes = [],
}: {
  status: string;
  editHref: string;
  notes?: string[];
}) {
  return (
    <div
      role="note"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-accent/60 bg-elevated/95 px-4 py-3 backdrop-blur"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 text-sm">
        <p>
          <span className="label-accent mr-2">Private preview</span>
          Status: <strong>{status.toLowerCase()}</strong>. Not indexed, not visible to visitors.
          {notes.length > 0 && (
            <span className="mt-1 block text-xs text-muted">{notes.join(' · ')}</span>
          )}
        </p>
        <Link href={editHref} className="btn-primary btn-sm">
          Back to editor
        </Link>
      </div>
    </div>
  );
}
