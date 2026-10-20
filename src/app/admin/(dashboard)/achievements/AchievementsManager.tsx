'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import { ConfirmDialog, StatusPill } from '@/components/admin/fields';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_LABELS } from '@/lib/validation/schemas';
import { formatDate, matchesQuery } from '@/lib/utils';

type Row = {
  id: string;
  slug: string;
  title: string;
  issuer: string;
  category: string;
  status: string;
  featured: boolean;
  order: number;
  previewApproved: boolean;
  documentPublic: boolean;
  dateLabel: string | null;
  issueDate: string | null;
  assetCount: number;
  thumbId: string | null;
};

export function AchievementsManager({ initial }: { initial: Row[] }) {
  const { api, toast } = useAdmin();
  const params = useSearchParams();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[]; deleteFiles: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!category || r.category === category) &&
          (!status || r.status === status) &&
          (!q || matchesQuery(`${r.title} ${r.issuer}`, q)),
      ),
    [rows, q, category, status],
  );
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

  const bulk = async (patch: Record<string, unknown>, label: string) => {
    if (!selected.length) return;
    try {
      await api('/api/admin/achievements/bulk', { method: 'POST', body: { ids: selected, patch } });
      setRows((rs) => rs.map((r) => (selected.includes(r.id) ? ({ ...r, ...patch } as Row) : r)));
      toast(`${label} — ${selected.length} record(s)`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const move = async (id: string, d: -1 | 1) => {
    const ordered = [...rows].sort(
      (a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order,
    );
    const i = ordered.findIndex((r) => r.id === id);
    const j = i + d;
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
    const next = ordered.map((r, order) => ({ ...r, order }));
    setRows(next);
    try {
      await api('/api/admin/achievements/bulk', {
        method: 'PUT',
        body: { ids: next.map((r) => r.id) },
      });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      for (const id of confirm.ids)
        await api(`/api/admin/achievements/${id}${confirm.deleteFiles ? '?deleteFiles=1' : ''}`, {
          method: 'DELETE',
        });
      setRows((rs) => rs.filter((r) => !confirm.ids.includes(r.id)));
      setSelected([]);
      toast('Deleted');
      setConfirm(null);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...filtered].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order,
  );

  return (
    <div>
      <div className="grid gap-3 rounded-sm border border-line p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="adm-q" className="label mb-1.5 block">
            Search
          </label>
          <input
            id="adm-q"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or issuer"
          />
        </div>
        <div>
          <label htmlFor="adm-cat" className="label mb-1.5 block">
            Category
          </label>
          <select
            id="adm-cat"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {ACHIEVEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ACHIEVEMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="adm-status" className="label mb-1.5 block">
            Status
          </label>
          <select
            id="adm-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <label className="mr-2 inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--c-signal))]"
            checked={allSelected}
            onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])}
          />
          Select all ({selected.length})
        </label>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!selected.length}
          onClick={() => bulk({ status: 'PUBLISHED' }, 'Published')}
        >
          Publish
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!selected.length}
          onClick={() => bulk({ status: 'DRAFT' }, 'Unpublished')}
        >
          Unpublish
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!selected.length}
          onClick={() => bulk({ status: 'ARCHIVED' }, 'Archived')}
        >
          Archive
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!selected.length}
          onClick={() => bulk({ previewApproved: true }, 'Previews approved')}
        >
          Approve previews
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!selected.length}
          onClick={() =>
            bulk({ previewApproved: false, documentPublic: false }, 'Images made private')
          }
        >
          Make images private
        </button>
        <select
          aria-label="Set category for selected"
          className="input w-auto"
          disabled={!selected.length}
          value=""
          onChange={(e) => e.target.value && bulk({ category: e.target.value }, 'Category updated')}
        >
          <option value="">Set category…</option>
          {ACHIEVEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ACHIEVEMENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-danger btn-sm"
          disabled={!selected.length}
          onClick={() => setConfirm({ ids: selected, deleteFiles: false })}
        >
          Delete
        </button>
      </div>

      <ul className="mt-6 grid gap-3">
        {sorted.length === 0 && (
          <li className="rounded-sm border border-dashed border-line p-8 text-center text-sm text-muted">
            No matching records.
          </li>
        )}
        {sorted.map((r, i) => (
          <li
            key={r.id}
            className="flex flex-col gap-3 rounded-sm border border-line p-3 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label={`Select ${r.title}`}
                className="h-5 w-5 accent-[rgb(var(--c-signal))]"
                checked={selected.includes(r.id)}
                onChange={(e) =>
                  setSelected((s) =>
                    e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id),
                  )
                }
              />
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xs bg-surface">
                {r.thumbId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/media/${r.thumbId}?v=thumb`}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[0.6rem] text-muted">
                    No image
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/achievements/${r.id}`} className="font-medium hover:text-accent">
                {r.title}
              </Link>
              <p className="truncate text-xs text-muted">
                {
                  ACHIEVEMENT_CATEGORY_LABELS[
                    r.category as keyof typeof ACHIEVEMENT_CATEGORY_LABELS
                  ]
                }{' '}
                · {r.issuer} · {r.dateLabel || formatDate(r.issueDate) || 'no date'}
              </p>
              <p className="mt-1 flex flex-wrap gap-2 text-[0.65rem]">
                <StatusPill status={r.status} />
                {r.featured && (
                  <span className="rounded-full border border-accent/50 px-2 text-accent">
                    featured
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 ${r.previewApproved ? 'border-accent/50 text-accent' : 'border-line text-muted'}`}
                >
                  preview {r.previewApproved ? 'approved' : 'private'}
                </span>
                <span className="rounded-full border border-line px-2 text-muted">
                  {r.assetCount} file(s)
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="btn-ghost btn-sm px-2"
                aria-label={`Move ${r.title} up`}
                onClick={() => move(r.id, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm px-2"
                aria-label={`Move ${r.title} down`}
                onClick={() => move(r.id, 1)}
                disabled={i === sorted.length - 1}
              >
                ↓
              </button>
              <a
                href={`/admin/preview/achievements/${r.id}`}
                target="_blank"
                rel="noopener"
                className="btn-ghost btn-sm"
              >
                Preview
              </a>
              <Link href={`/admin/achievements/${r.id}`} className="btn-ghost btn-sm">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Delete ${confirm?.ids.length ?? 0} achievement(s)?`}
        danger
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      >
        <p>This cannot be undone. Consider archiving instead.</p>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={confirm?.deleteFiles ?? false}
            onChange={(e) => setConfirm((c) => (c ? { ...c, deleteFiles: e.target.checked } : c))}
          />
          Also delete attached files that are not used anywhere else
        </label>
      </ConfirmDialog>
    </div>
  );
}
