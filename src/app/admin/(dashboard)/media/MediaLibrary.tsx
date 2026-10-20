'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorMessage, useAdmin, type UploadedMedia } from '@/components/admin/AdminContext';
import { Uploader } from '@/components/admin/Uploader';
import { MediaThumb } from '@/components/admin/MediaPicker';
import { ConfirmDialog, SelectField, TextArea, TextField } from '@/components/admin/fields';
import { formatBytes, formatDate } from '@/lib/utils';

type Usage = { type: string; id: string; label: string };

export function MediaLibrary() {
  const { api, toast } = useAdmin();
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [kind, setKind] = useState('');
  const [visibility, setVisibility] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<UploadedMedia | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [form, setForm] = useState({
    alt: '',
    caption: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
  });
  const [confirm, setConfirm] = useState<{ force: boolean } | null>(null);
  const [orphans, setOrphans] = useState<{ strayObjects: string[]; unreferenced: string[] } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), take: '48' });
      if (kind) params.set('kind', kind);
      if (visibility) params.set('visibility', visibility);
      if (q) params.set('q', q);
      const r = await api<{ items: UploadedMedia[]; total: number }>(`/api/admin/media?${params}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [api, kind, visibility, q, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (m: UploadedMedia) => {
    setActive(m);
    setForm({ alt: m.alt, caption: m.caption ?? '', visibility: m.visibility });
    try {
      const r = await api<{ usage: Usage[] }>(`/api/admin/media/${m.id}`);
      setUsage(r.usage);
    } catch {
      setUsage([]);
    }
  };

  const save = async () => {
    if (!active) return;
    try {
      const r = await api<{ media: UploadedMedia; managed: boolean }>(
        `/api/admin/media/${active.id}`,
        { method: 'PATCH', body: form },
      );
      setItems((xs) => xs.map((x) => (x.id === active.id ? r.media : x)));
      setActive(r.media);
      toast(r.managed ? 'Saved. Visibility is managed by the content using this file.' : 'Saved');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const remove = async () => {
    if (!active || !confirm) return;
    try {
      await api(`/api/admin/media/${active.id}${confirm.force ? '?force=1' : ''}`, {
        method: 'DELETE',
      });
      setItems((xs) => xs.filter((x) => x.id !== active.id));
      setActive(null);
      setConfirm(null);
      toast('File deleted');
    } catch (e) {
      toast(errorMessage(e), 'error');
      setConfirm(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 48));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div>
        <Uploader
          accept={['IMAGE', 'PDF', 'VIDEO', 'DOCUMENT']}
          onUploaded={(m) => setItems((xs) => [m, ...xs])}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <form
            className="sm:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              void load();
            }}
          >
            <label htmlFor="ml-q" className="label mb-1.5 block">
              Search
            </label>
            <input
              id="ml-q"
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="File name or alt text"
            />
          </form>
          <SelectField
            label="Type"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All' },
              { value: 'IMAGE', label: 'Images' },
              { value: 'PDF', label: 'PDFs' },
              { value: 'VIDEO', label: 'Videos' },
              { value: 'DOCUMENT', label: 'Captions' },
            ]}
          />
          <SelectField
            label="Visibility"
            value={visibility}
            onChange={(v) => {
              setVisibility(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All' },
              { value: 'PUBLIC', label: 'Public' },
              { value: 'PRIVATE', label: 'Private' },
            ]}
          />
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square rounded-sm" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-6 rounded-sm border border-dashed border-line p-10 text-center text-sm text-muted">
            No files match.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  aria-pressed={active?.id === m.id}
                  className={`block w-full overflow-hidden rounded-sm border text-left ${active?.id === m.id ? 'border-signal ring-2 ring-signal' : 'border-line hover:border-fg'}`}
                >
                  <span className="block aspect-square bg-bg">
                    <MediaThumb media={m} />
                  </span>
                  <span className="flex items-center justify-between gap-1 px-2 py-1 text-[0.6rem]">
                    <span className="truncate text-muted">{m.originalName}</span>
                    <span className={m.visibility === 'PUBLIC' ? 'text-accent' : 'text-muted'}>
                      {m.visibility === 'PUBLIC' ? '●' : '○'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="text-xs text-muted">
              Page {page} / {pages}
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        )}

        <section className="mt-10 rounded-sm border border-line p-4">
          <h2 className="label-accent">Maintenance</h2>
          <p className="mt-1 text-xs text-muted">
            Find files not used by any content (older than 24 h) and storage objects without a
            database record.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={async () => {
                try {
                  setOrphans(await api('/api/admin/media/orphans'));
                } catch (e) {
                  toast(errorMessage(e), 'error');
                }
              }}
            >
              Scan for orphans
            </button>
            {orphans && (orphans.unreferenced.length > 0 || orphans.strayObjects.length > 0) && (
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={async () => {
                  try {
                    await api('/api/admin/media/orphans', { method: 'POST' });
                    setOrphans(null);
                    toast('Orphaned files removed');
                    void load();
                  } catch (e) {
                    toast(errorMessage(e), 'error');
                  }
                }}
              >
                Delete {orphans.unreferenced.length + orphans.strayObjects.length} orphan(s)
              </button>
            )}
          </div>
          {orphans && (
            <p className="mt-2 text-xs text-muted">
              {orphans.unreferenced.length} unreferenced file(s), {orphans.strayObjects.length}{' '}
              stray storage object(s).
            </p>
          )}
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        {active ? (
          <div className="rounded-sm border border-line p-4">
            <div className="aspect-[4/3] overflow-hidden rounded-xs bg-bg">
              <MediaThumb media={active} />
            </div>
            <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-1 text-xs">
              <dt className="text-muted">File</dt>
              <dd className="break-all">{active.originalName}</dd>
              <dt className="text-muted">Type</dt>
              <dd>{active.mimeType}</dd>
              <dt className="text-muted">Size</dt>
              <dd>
                {formatBytes(active.sizeBytes)}
                {active.width ? ` · ${active.width}×${active.height}` : ''}
              </dd>
              <dt className="text-muted">Uploaded</dt>
              <dd>{formatDate(active.createdAt)}</dd>
              <dt className="text-muted">Visibility</dt>
              <dd className={active.visibility === 'PUBLIC' ? 'text-accent' : ''}>
                {active.visibility}
              </dd>
            </dl>
            <div className="mt-4 grid gap-4">
              <TextField
                label="Alt text"
                value={form.alt}
                onChange={(v) => setForm((f) => ({ ...f, alt: v }))}
                hint="Describe the image for screen-reader users."
              />
              <TextArea
                label="Caption"
                value={form.caption}
                rows={2}
                onChange={(v) => setForm((f) => ({ ...f, caption: v }))}
              />
              <SelectField
                label="Visibility"
                value={form.visibility}
                onChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
                options={[
                  { value: 'PRIVATE', label: 'Private (admin only)' },
                  { value: 'PUBLIC', label: 'Public' },
                ]}
                hint={
                  usage.length
                    ? 'Managed automatically — this file is used by content.'
                    : 'Applies only to unused files.'
                }
              />
            </div>
            <div className="mt-4">
              <p className="label mb-1">Used by</p>
              {usage.length ? (
                <ul className="space-y-1 text-xs">
                  {usage.map((u, i) => (
                    <li key={i}>{u.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">Not used anywhere.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={save}>
                Save
              </button>
              <a
                href={`/media/${active.id}`}
                target="_blank"
                rel="noopener"
                className="btn-ghost btn-sm"
              >
                Open original
              </a>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => setConfirm({ force: usage.length > 0 })}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-sm border border-dashed border-line p-6 text-center text-sm text-muted">
            Select a file to edit its details.
          </p>
        )}
      </aside>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this file permanently?"
        danger
        confirmLabel="Delete file"
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      >
        {usage.length ? (
          <>
            <p>This file is still used by:</p>
            <ul className="mt-2 list-disc pl-5">
              {usage.map((u, i) => (
                <li key={i}>{u.label}</li>
              ))}
            </ul>
            <p className="mt-2">Deleting removes it from all of them.</p>
          </>
        ) : (
          'The file and its generated variants will be removed from storage.'
        )}
      </ConfirmDialog>
    </div>
  );
}
