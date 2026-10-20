'use client';

import Link from 'next/link';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import { ConfirmDialog, StatusPill } from '@/components/admin/fields';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';
import { formatDate } from '@/lib/utils';

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  stage: string;
  status: string;
  featured: boolean;
  order: number;
  updatedAt: string;
};

export function ProjectsTable({ initial }: { initial: Row[] }) {
  const { api, toast } = useAdmin();
  const [rows, setRows] = useState(initial);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const move = async (i: number, d: -1 | 1) => {
    const next = [...rows];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setRows(next);
    try {
      await api('/api/admin/projects/reorder', {
        method: 'POST',
        body: { ids: next.map((r) => r.id) },
      });
      toast('Order saved');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const setStatus = async (r: Row, status: string) => {
    try {
      await api(`/api/admin/projects/${r.id}`, { method: 'PATCH', body: { status } });
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status } : x)));
      toast(
        status === 'PUBLISHED'
          ? 'Published'
          : status === 'ARCHIVED'
            ? 'Archived'
            : 'Moved to drafts',
      );
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`/api/admin/projects/${confirm.id}`, { method: 'DELETE' });
      setRows((rs) => rs.filter((x) => x.id !== confirm.id));
      toast('Project deleted');
      setConfirm(null);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ResponsiveTable
        caption="Projects"
        empty="No projects yet."
        columns={[
          { key: 'order', label: 'Order', className: 'md:w-24' },
          { key: 'title', label: 'Project' },
          { key: 'status', label: 'Status' },
          { key: 'updated', label: 'Updated' },
          { key: 'actions', label: 'Actions', className: 'md:text-right' },
        ]}
        rows={rows.map((r, i) => ({
          id: r.id,
          cells: {
            order: (
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  className="btn-ghost btn-sm px-2"
                  aria-label={`Move ${r.title} up`}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm px-2"
                  aria-label={`Move ${r.title} down`}
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                >
                  ↓
                </button>
              </span>
            ),
            title: (
              <div>
                <Link href={`/admin/projects/${r.id}`} className="font-medium hover:text-accent">
                  {r.title}
                </Link>
                <p className="text-xs text-muted">
                  {r.category} · {r.stage.toLowerCase().replace('_', ' ')}{' '}
                  {r.featured && '· featured'}
                </p>
              </div>
            ),
            status: <StatusPill status={r.status} />,
            updated: <span className="text-xs text-muted">{formatDate(r.updatedAt)}</span>,
            actions: (
              <span className="flex flex-wrap gap-1 md:justify-end">
                {r.status !== 'PUBLISHED' ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setStatus(r, 'PUBLISHED')}
                  >
                    Publish
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setStatus(r, 'DRAFT')}
                  >
                    Unpublish
                  </button>
                )}
                {r.status === 'PUBLISHED' && (
                  <a
                    href={`/work/${r.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-ghost btn-sm"
                  >
                    View
                  </a>
                )}
                <Link href={`/admin/projects/${r.id}`} className="btn-ghost btn-sm">
                  Edit
                </Link>
                <button type="button" className="btn-danger btn-sm" onClick={() => setConfirm(r)}>
                  Delete
                </button>
              </span>
            ),
          },
        }))}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Delete “${confirm?.title}”?`}
        danger
        confirmLabel="Delete project"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      >
        This permanently removes the case study. Uploaded media stays in the media library. Consider
        archiving instead.
      </ConfirmDialog>
    </>
  );
}
