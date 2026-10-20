'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import {
  ConfirmDialog,
  Panel,
  SelectField,
  StatusPill,
  TagInput,
  TextArea,
  TextField,
  Toggle,
} from '@/components/admin/fields';
import { MediaSlot } from '@/components/admin/MediaPicker';
import type { GalleryItem } from '@/components/admin/GalleryEditor';
import { slugify } from '@/lib/utils';

type V = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  provider: 'YOUTUBE' | 'VIMEO' | 'UPLOAD';
  externalUrl: string;
  file: GalleryItem | null;
  poster: GalleryItem | null;
  captions: GalleryItem | null;
  durationSeconds: string;
  transcript: string;
  projectId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  order: number;
  tags: string[];
};

const EMPTY: V = {
  slug: '',
  title: '',
  description: '',
  category: 'Demo',
  provider: 'YOUTUBE',
  externalUrl: '',
  file: null,
  poster: null,
  captions: null,
  durationSeconds: '',
  transcript: '',
  projectId: '',
  status: 'DRAFT',
  featured: false,
  order: 0,
  tags: [],
};

export function VideosManager({
  initial,
  projects,
}: {
  initial: V[];
  projects: { id: string; title: string }[];
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [edit, setEdit] = useState<V | null>(null);
  const [del, setDel] = useState<V | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof V>(k: K, v: V[K]) => setEdit((e) => (e ? { ...e, [k]: v } : e));

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const body = {
        ...edit,
        fileId: edit.file?.id ?? null,
        posterId: edit.poster?.id ?? null,
        captionsId: edit.captions?.id ?? null,
        durationSeconds: edit.durationSeconds || null,
        projectId: edit.projectId || null,
      };
      const r = await api<{ video: { id: string } }>(
        edit.id ? `/api/admin/videos/${edit.id}` : '/api/admin/videos',
        {
          method: edit.id ? 'PUT' : 'POST',
          body,
        },
      );
      const saved = { ...edit, id: r.video.id };
      setList((l) => (edit.id ? l.map((x) => (x.id === edit.id ? saved : x)) : [saved, ...l]));
      setEdit(null);
      toast('Video saved');
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!del?.id) return;
    try {
      await api(`/api/admin/videos/${del.id}`, { method: 'DELETE' });
      setList((l) => l.filter((x) => x.id !== del.id));
      setDel(null);
      toast('Video deleted');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="grid gap-6">
      {!edit && (
        <div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setEdit({ ...EMPTY })}
          >
            Add video
          </button>
        </div>
      )}

      {edit && (
        <Panel title={edit.id ? `Edit: ${edit.title}` : 'New video'}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Title"
              value={edit.title}
              onChange={(v) => {
                set('title', v);
                if (!edit.id) set('slug', slugify(v));
              }}
            />
            <TextField
              label="Slug"
              value={edit.slug}
              onChange={(v) => set('slug', v.toLowerCase())}
            />
            <SelectField
              label="Source"
              value={edit.provider}
              onChange={(v) => set('provider', v)}
              options={[
                { value: 'YOUTUBE', label: 'YouTube (privacy-enhanced embed)' },
                { value: 'VIMEO', label: 'Vimeo (do-not-track embed)' },
                { value: 'UPLOAD', label: 'Uploaded MP4 / WebM' },
              ]}
            />
            <TextField
              label="Category"
              value={edit.category}
              onChange={(v) => set('category', v)}
            />
          </div>
          {edit.provider === 'UPLOAD' ? (
            <MediaSlot
              label="Video file"
              value={edit.file}
              kinds={['VIDEO']}
              onChange={(m) => set('file', m)}
              hint="MP4 (H.264/AAC) plays everywhere."
            />
          ) : (
            <TextField
              label="Video URL"
              type="url"
              value={edit.externalUrl}
              onChange={(v) => set('externalUrl', v)}
              hint="Paste the normal watch URL. Only the video ID is stored."
            />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <MediaSlot
              label="Poster / thumbnail"
              value={edit.poster}
              onChange={(m) => set('poster', m)}
              hint="Recommended: 16:9 still from the video."
            />
            <MediaSlot
              label="Captions (WebVTT)"
              value={edit.captions}
              kinds={['DOCUMENT']}
              onChange={(m) => set('captions', m)}
              hint="Used for uploaded videos."
            />
          </div>
          <TextArea
            label="Description"
            value={edit.description}
            rows={3}
            onChange={(v) => set('description', v)}
          />
          <TextArea
            label="Transcript"
            value={edit.transcript}
            rows={5}
            onChange={(v) => set('transcript', v)}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              label="Duration (seconds)"
              type="number"
              min={1}
              value={edit.durationSeconds}
              onChange={(v) => set('durationSeconds', v)}
              hint="Leave blank if unknown."
            />
            <SelectField
              label="Project"
              value={edit.projectId}
              onChange={(v) => set('projectId', v)}
              options={[
                { value: '', label: '— None —' },
                ...projects.map((p) => ({ value: p.id, label: p.title })),
              ]}
            />
            <TextField
              label="Order"
              type="number"
              min={0}
              value={String(edit.order)}
              onChange={(v) => set('order', Number(v) || 0)}
            />
          </div>
          <TagInput label="Tags" value={edit.tags} onChange={(v) => set('tags', v)} />
          <div className="flex flex-wrap items-center gap-6">
            <SelectField
              label="Status"
              value={edit.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
            <Toggle label="Featured" checked={edit.featured} onChange={(v) => set('featured', v)} />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save video'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </Panel>
      )}

      <ul className="grid gap-3">
        {list.length === 0 && (
          <li className="rounded-sm border border-dashed border-line p-8 text-center text-sm text-muted">
            No videos yet.
          </li>
        )}
        {list.map((v) => (
          <li
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line p-3"
          >
            <div>
              <p className="font-medium">{v.title}</p>
              <p className="text-xs text-muted">
                {v.provider.toLowerCase()} · {v.category} {v.featured && '· featured'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={v.status} />
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(v)}>
                Edit
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={() => setDel(v)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(del)}
        title={`Delete “${del?.title}”?`}
        danger
        confirmLabel="Delete"
        onCancel={() => setDel(null)}
        onConfirm={remove}
      >
        Uploaded files stay in the media library.
      </ConfirmDialog>
    </div>
  );
}
