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
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategoryKey,
} from '@/lib/validation/schemas';
import { slugify } from '@/lib/utils';

export type AchievementForm = {
  id?: string;
  slug: string;
  title: string;
  category: AchievementCategoryKey;
  issuer: string;
  recipientName: string;
  issueDate: string;
  dateLabel: string;
  expirationDate: string;
  credentialId: string;
  verificationUrl: string;
  summary: string;
  context: string;
  learned: string;
  skillsCovered: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  order: number;
  showCredentialId: boolean;
  showVerification: boolean;
  showRecipient: boolean;
  documentPublic: boolean;
  previewApproved: boolean;
  verified: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  tags: string[];
  projectIds: string[];
  postIds: string[];
};

export function AchievementEditor({
  initial,
  projects,
  posts,
  hasAssets,
}: {
  initial: AchievementForm;
  projects: { id: string; title: string }[];
  posts: { id: string; title: string }[];
  hasAssets: boolean;
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const set = <K extends keyof AchievementForm>(k: K, v: AchievementForm[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const save = async (status?: AchievementForm['status']) => {
    setSaving(true);
    try {
      const body = { ...f, status: status ?? f.status };
      const r = await api<{ achievement: { id: string; status: AchievementForm['status'] } }>(
        f.id ? `/api/admin/achievements/${f.id}` : '/api/admin/achievements',
        { method: f.id ? 'PUT' : 'POST', body },
      );
      setF((x) => ({ ...x, id: r.achievement.id, status: r.achievement.status }));
      setSavedAt(new Date().toLocaleTimeString());
      toast(status === 'PUBLISHED' ? 'Saved and published' : 'Saved');
      if (!f.id) router.replace(`/admin/achievements/${r.achievement.id}`);
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleId = (key: 'projectIds' | 'postIds', id: string) =>
    set(key, f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id]);

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
          <Panel title="Record">
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
                hint={`/achievements/${f.slug || '…'}`}
                onChange={(v) => {
                  setSlugTouched(true);
                  set('slug', v.toLowerCase());
                }}
              />
              <SelectField
                label="Category"
                value={f.category}
                onChange={(v) => set('category', v)}
                options={ACHIEVEMENT_CATEGORIES.map((c) => ({
                  value: c,
                  label: ACHIEVEMENT_CATEGORY_LABELS[c],
                }))}
              />
              <TextField
                label="Issuing organisation"
                value={f.issuer}
                required
                onChange={(v) => set('issuer', v)}
              />
              <TextField
                label="Recipient name"
                value={f.recipientName}
                onChange={(v) => set('recipientName', v)}
              />
              <TextField
                label="Date label"
                value={f.dateLabel}
                onChange={(v) => set('dateLabel', v)}
                hint="Free text when an exact date is unknown, e.g. “2025–26”."
              />
              <TextField
                label="Issue date"
                type="date"
                value={f.issueDate}
                onChange={(v) => set('issueDate', v)}
                hint="Only if printed on the document."
              />
              <TextField
                label="Expiration date"
                type="date"
                value={f.expirationDate}
                onChange={(v) => set('expirationDate', v)}
              />
            </div>
            <TextArea
              label="Short description"
              value={f.summary}
              rows={3}
              onChange={(v) => set('summary', v)}
            />
            <MarkdownField
              label="Detailed context"
              value={f.context}
              onChange={(v) => set('context', v)}
              rows={6}
            />
            <MarkdownField
              label="What I learned / accomplished"
              value={f.learned}
              onChange={(v) => set('learned', v)}
              rows={6}
            />
            <TagInput
              label="Skills / subjects covered"
              value={f.skillsCovered}
              onChange={(v) => set('skillsCovered', v)}
            />
            <TagInput label="Tags" value={f.tags} onChange={(v) => set('tags', v)} />
          </Panel>

          <Panel
            title="Credential"
            description="Never invent IDs or links. Leave blank when not provided by the issuer."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Credential ID"
                value={f.credentialId}
                onChange={(v) => set('credentialId', v)}
                hint="Private unless you enable “Show credential ID”."
              />
              <TextField
                label="Official verification URL"
                type="url"
                value={f.verificationUrl}
                onChange={(v) => set('verificationUrl', v)}
              />
            </div>
          </Panel>

          <Panel title="Related content">
            <fieldset>
              <legend className="label mb-2">Projects</legend>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip normal-case"
                    aria-pressed={f.projectIds.includes(p.id)}
                    onClick={() => toggleId('projectIds', p.id)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label mb-2">Articles</legend>
              <div className="flex flex-wrap gap-2">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip normal-case"
                    aria-pressed={f.postIds.includes(p.id)}
                    onClick={() => toggleId('postIds', p.id)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </fieldset>
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
            <Toggle label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} />
            <TextField
              label="Display order"
              type="number"
              min={0}
              value={String(f.order)}
              onChange={(v) => set('order', Number(v) || 0)}
            />
            {!hasAssets && (
              <p className="rounded-sm border border-line p-3 text-xs text-muted">
                No certificate image yet — the public page will show a clearly labelled placeholder.
              </p>
            )}
          </Panel>
          <Panel title="Visibility & authenticity" description="Everything is private by default.">
            <Toggle
              label="Preview approved for publication"
              hint="Allows preview, photos and gallery images to be public on a published record."
              checked={f.previewApproved}
              onChange={(v) => set('previewApproved', v)}
            />
            <Toggle
              label="Original document is public"
              hint="Lets visitors open/download the original file. Check it for personal identifiers and signatures first."
              checked={f.documentPublic}
              onChange={(v) => set('documentPublic', v)}
            />
            <Toggle
              label="Show credential ID"
              checked={f.showCredentialId}
              onChange={(v) => set('showCredentialId', v)}
            />
            <Toggle
              label="Show verification link"
              checked={f.showVerification}
              onChange={(v) => set('showVerification', v)}
            />
            <Toggle
              label="Show recipient name"
              checked={f.showRecipient}
              onChange={(v) => set('showRecipient', v)}
            />
            <Toggle
              label="I verified this with the issuer"
              hint="Shows an “Owner-verified” badge. Do not enable unless you checked."
              checked={f.verified}
              onChange={(v) => set('verified', v)}
            />
          </Panel>
          <Panel title="SEO">
            <TextField
              label="SEO title"
              value={f.seoTitle}
              maxLength={70}
              onChange={(v) => set('seoTitle', v)}
            />
            <TextArea
              label="SEO description"
              value={f.seoDescription}
              maxLength={170}
              rows={3}
              onChange={(v) => set('seoDescription', v)}
            />
            <TextField
              label="Canonical URL"
              type="url"
              value={f.canonicalUrl}
              onChange={(v) => set('canonicalUrl', v)}
              hint="Leave blank to use this site's URL."
            />
          </Panel>
        </div>
      </div>

      <SaveBar status={saving ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : ''}>
        {f.id && (
          <a
            href={`/admin/preview/achievements/${f.id}`}
            target="_blank"
            rel="noopener"
            className="btn-ghost btn-sm"
          >
            Preview
          </a>
        )}
        <button type="submit" className="btn-ghost btn-sm" disabled={saving}>
          Save
        </button>
        {f.status !== 'PUBLISHED' ? (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={saving}
            onClick={() => save('PUBLISHED')}
          >
            Save & publish
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
    </form>
  );
}
