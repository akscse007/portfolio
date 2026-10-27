'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import {
  ConfirmDialog,
  Panel,
  SaveBar,
  SelectField,
  TagInput,
  TextArea,
  TextField,
  Toggle,
} from '@/components/admin/fields';
import { MediaSlot } from '@/components/admin/MediaPicker';
import type { GalleryItem } from '@/components/admin/GalleryEditor';
import { slugify, SLUG_RE } from '@/lib/utils';

export type LibraryNoteForm = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  academicLevel: string;
  media: GalleryItem | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  order: string;
  tags: string[];
};

export function LibraryNoteEditor({
  initial,
  takenSlugs,
}: {
  initial: LibraryNoteForm;
  takenSlugs: string[];
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof LibraryNoteForm>(k: K, v: LibraryNoteForm[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const slugError = !f.slug
    ? 'Required'
    : !SLUG_RE.test(f.slug)
      ? 'Lowercase letters, numbers and hyphens only'
      : takenSlugs.includes(f.slug)
        ? 'Another note already uses this slug'
        : undefined;

  const save = async (status?: LibraryNoteForm['status']) => {
    if (slugError) { toast(`Slug: ${slugError}`, 'error'); return; }
    if (!f.media) { toast('Please select a PDF file', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        ...f,
        status: status ?? f.status,
        mediaId: f.media.id,
        order: Number(f.order) || 0,
      };
      const r = await api<{ note: { id: string; status: LibraryNoteForm['status'] } }>(
        f.id ? `/api/admin/library/${f.id}` : '/api/admin/library',
        { method: f.id ? 'PUT' : 'POST', body },
      );
      setF((x) => ({ ...x, id: r.note.id, status: r.note.status }));
      toast(status === 'PUBLISHED' ? 'Published' : 'Saved');
      if (!f.id) router.replace(`/admin/library/${r.note.id}`);
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!f.id) return;
    try {
      await api(`/api/admin/library/${f.id}`, { method: 'DELETE' });
      toast('Deleted');
      router.replace('/admin/library');
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Title"
          value={f.title}
          required
          onChange={(v) => {
            set('title', v);
            if (!slugTouched) set('slug', slugify(v));
          }}
        />
        <TextField
          label="Slug"
          value={f.slug}
          error={slugError}
          hint={`/notes-library (used for identification)`}
          onChange={(v) => { setSlugTouched(true); set('slug', v.toLowerCase()); }}
        />
      </div>
      <TextArea
        label="Description"
        value={f.description}
        rows={3}
        maxLength={2000}
        onChange={(v) => set('description', v)}
        hint="Displayed on the library card."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Classification">
          <SelectField
            label="Subject"
            value={f.subject}
            onChange={(v) => set('subject', v)}
            options={[
              { value: 'Mathematics', label: 'Mathematics' },
              { value: 'Computer Science', label: 'Computer Science' },
              { value: 'AI/ML', label: 'AI/ML' },
              { value: 'Physics', label: 'Physics' },
              { value: 'Engineering', label: 'Engineering' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Statistics', label: 'Statistics' },
              { value: 'General', label: 'General' },
            ]}
          />
          <SelectField
            label="Category"
            value={f.category}
            onChange={(v) => set('category', v)}
            options={[
              { value: 'Notes', label: 'Notes' },
              { value: 'Cheat Sheet', label: 'Cheat Sheet' },
              { value: 'Formula Sheet', label: 'Formula Sheet' },
              { value: 'Study Guide', label: 'Study Guide' },
              { value: 'Reference', label: 'Reference' },
              { value: 'Tutorial', label: 'Tutorial' },
              { value: 'Problem Set', label: 'Problem Set' },
            ]}
          />
          <SelectField
            label="Academic level"
            value={f.academicLevel}
            onChange={(v) => set('academicLevel', v)}
            options={[
              { value: 'High School', label: 'High School' },
              { value: 'Undergraduate', label: 'Undergraduate' },
              { value: 'Graduate', label: 'Graduate' },
              { value: 'Professional', label: 'Professional' },
            ]}
          />
          <TagInput label="Tags" value={f.tags} onChange={(v) => set('tags', v)} />
        </Panel>
        <Panel title="Publishing">
          <SelectField
            label="Status"
            value={f.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'DRAFT', label: 'Draft (private)' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'ARCHIVED', label: 'Archived (hidden)' },
            ]}
          />
          <Toggle label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} />
          <TextField
            label="Display order"
            type="number"
            min={0}
            value={f.order}
            onChange={(v) => set('order', v)}
          />
        </Panel>
        <Panel title="PDF file">
          <MediaSlot
            label="PDF document (required)"
            value={f.media}
            onChange={(m) => set('media', m)}
            kinds={['PDF']}
          />
        </Panel>
      </div>

      <SaveBar status={saving ? 'Saving…' : f.id ? 'All changes saved' : 'New — not saved yet'}>
        {f.id && (
          <button
            type="button"
            className="btn-ghost btn-sm text-red-500"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
        <button type="button" className="btn-ghost btn-sm" disabled={saving} onClick={() => save()}>
          {f.status === 'PUBLISHED' ? 'Update' : 'Save draft'}
        </button>
        {f.status !== 'PUBLISHED' ? (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={saving}
            onClick={() => save('PUBLISHED')}
          >
            Publish
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={saving}
            onClick={() => save('DRAFT')}
          >
            Unpublish
          </button>
        )}
      </SaveBar>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this library note?"
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      >
        This permanently removes the note. The uploaded PDF remains in the media library.
      </ConfirmDialog>
    </div>
  );
}
