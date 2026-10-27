'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import {
  MarkdownField,
  Panel,
  SaveBar,
  SelectField,
  TagInput,
  TextArea,
  TextField,
  Toggle,
} from '@/components/admin/fields';
import { MediaSlot } from '@/components/admin/MediaPicker';
import { GalleryEditor, type GalleryItem } from '@/components/admin/GalleryEditor';
import { PROJECT_CATEGORIES } from '@/lib/validation/schemas';
import { slugify } from '@/lib/utils';

export type ProjectForm = {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: (typeof PROJECT_CATEGORIES)[number];
  stage: 'LIVE' | 'IN_PROGRESS' | 'RESEARCH' | 'PROTOTYPE' | 'ARCHIVED';
  stageNote: string;
  role: string;
  period: string;
  problem: string;
  solution: string;
  architecture: string;
  contribution: string;
  decisions: string;
  challenges: string;
  lessons: string;
  liveUrl: string;
  repoUrl: string;
  cover: GalleryItem | null;
  previewVideo: GalleryItem | null;
  accent: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  order: number;
  seoTitle: string;
  seoDescription: string;
  skills: string[];
  tags: string[];
  gallery: GalleryItem[];
};

export function ProjectEditor({
  initial,
  skillSuggestions,
}: {
  initial: ProjectForm;
  skillSuggestions: string[];
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const save = async (status?: ProjectForm['status']) => {
    setSaving(true);
    const body = {
      ...f,
      status: status ?? f.status,
      coverId: f.cover?.id ?? null,
      previewVideoId: f.previewVideo?.id ?? null,
      mediaIds: f.gallery.map((g) => g.id),
      accent: f.accent || null,
    };
    try {
      const r = await api<{ project: { id: string; status: ProjectForm['status'] } }>(
        f.id ? `/api/admin/projects/${f.id}` : '/api/admin/projects',
        {
          method: f.id ? 'PUT' : 'POST',
          body,
        },
      );
      setF((x) => ({ ...x, status: r.project.status, id: r.project.id }));
      setSavedAt(new Date().toLocaleTimeString());
      toast(status === 'PUBLISHED' ? 'Saved and published' : 'Saved');
      if (!f.id) router.replace(`/admin/projects/${r.project.id}`);
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-6"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-2">
          <Panel title="Basics">
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
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                hint={`/work/${f.slug || '…'}`}
                onChange={(v) => {
                  setSlugTouched(true);
                  set('slug', v.toLowerCase());
                }}
              />
            </div>
            <TextField label="Subtitle" value={f.subtitle} onChange={(v) => set('subtitle', v)} />
            <TextArea
              label="Summary"
              value={f.summary}
              rows={3}
              onChange={(v) => set('summary', v)}
              hint="Shown on cards and in search results (10–600 characters)."
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <SelectField
                label="Category"
                value={f.category}
                onChange={(v) => set('category', v)}
                options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <SelectField
                label="Stage"
                value={f.stage}
                onChange={(v) => set('stage', v)}
                options={[
                  { value: 'LIVE', label: 'Live' },
                  { value: 'IN_PROGRESS', label: 'Work in progress' },
                  { value: 'RESEARCH', label: 'Research' },
                  { value: 'PROTOTYPE', label: 'Prototype / demo' },
                  { value: 'ARCHIVED', label: 'Archived' },
                ]}
              />
              <TextField
                label="Stage note"
                value={f.stageNote}
                onChange={(v) => set('stageNote', v)}
                hint="e.g. “Simulated data”"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="My role" value={f.role} onChange={(v) => set('role', v)} />
              <TextField label="Period" value={f.period} onChange={(v) => set('period', v)} />
              <TextField
                label="Live URL"
                type="url"
                value={f.liveUrl}
                onChange={(v) => set('liveUrl', v)}
                hint="Only real, confirmed URLs."
              />
              <TextField
                label="Repository URL"
                type="url"
                value={f.repoUrl}
                onChange={(v) => set('repoUrl', v)}
              />
            </div>
          </Panel>

          <Panel title="Case study" description="Empty sections are hidden on the public page.">
            <MarkdownField
              label="Problem & motivation"
              value={f.problem}
              onChange={(v) => set('problem', v)}
            />
            <MarkdownField
              label="Solution"
              value={f.solution}
              onChange={(v) => set('solution', v)}
            />
            <MarkdownField
              label="Architecture"
              value={f.architecture}
              onChange={(v) => set('architecture', v)}
            />
            <MarkdownField
              label="My role & contribution"
              value={f.contribution}
              onChange={(v) => set('contribution', v)}
            />
            <MarkdownField
              label="Design decisions & trade-offs"
              value={f.decisions}
              onChange={(v) => set('decisions', v)}
            />
            <MarkdownField
              label="Challenges"
              value={f.challenges}
              onChange={(v) => set('challenges', v)}
            />
            <MarkdownField
              label="Lessons & notes"
              value={f.lessons}
              onChange={(v) => set('lessons', v)}
            />
          </Panel>

          <Panel title="Media">
            <MediaSlot
              label="Cover image"
              value={f.cover}
              onChange={(m) => set('cover', m)}
              hint="Use a 16:10 screenshot. Alt text is edited in the media library."
            />
            <MediaSlot
              label="Preview video"
              value={f.previewVideo}
              onChange={(m) => set('previewVideo', m)}
              kinds={['VIDEO']}
              hint="Optional video shown on the project detail page."
            />
            <GalleryEditor
              label="Screens & media gallery"
              items={f.gallery}
              onChange={(g) => set('gallery', g)}
            />
          </Panel>
        </div>

        <div className="grid content-start gap-6">
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
            <Toggle
              label="Featured"
              hint="Shown in the home-page storytelling section"
              checked={f.featured}
              onChange={(v) => set('featured', v)}
            />
            <TextField
              label="Display order"
              type="number"
              min={0}
              value={String(f.order)}
              onChange={(v) => set('order', Number(v) || 0)}
            />
            <TextField
              label="Accent colour"
              value={f.accent}
              onChange={(v) => set('accent', v)}
              hint="Optional hex, e.g. #c6f432"
            />
          </Panel>
          <Panel title="Taxonomy">
            <TagInput
              label="Technologies"
              value={f.skills}
              onChange={(v) => set('skills', v)}
              suggestions={skillSuggestions}
              hint="Links skills on /about to this project."
            />
            <TagInput label="Tags" value={f.tags} onChange={(v) => set('tags', v)} />
          </Panel>
          <Panel title="SEO">
            <TextField
              label="SEO title"
              value={f.seoTitle}
              maxLength={70}
              onChange={(v) => set('seoTitle', v)}
              hint={`${f.seoTitle.length}/70`}
            />
            <TextArea
              label="SEO description"
              value={f.seoDescription}
              maxLength={170}
              rows={3}
              onChange={(v) => set('seoDescription', v)}
              hint={`${f.seoDescription.length}/170`}
            />
          </Panel>
        </div>
      </div>

      <SaveBar
        status={
          saving
            ? 'Saving…'
            : savedAt
              ? `Saved at ${savedAt}`
              : f.id
                ? 'Unsaved changes are kept in this form until you save.'
                : 'New project'
        }
      >
        {f.id && f.status === 'PUBLISHED' && (
          <a href={`/work/${f.slug}`} target="_blank" rel="noopener" className="btn-ghost btn-sm">
            View live
          </a>
        )}
        <button type="submit" className="btn-ghost btn-sm" disabled={saving}>
          Save
        </button>
        {f.status !== 'PUBLISHED' && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={saving}
            onClick={() => save('PUBLISHED')}
          >
            Save & publish
          </button>
        )}
      </SaveBar>
    </form>
  );
}
