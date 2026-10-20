'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { MediaPicker, MediaSlot } from '@/components/admin/MediaPicker';
import type { GalleryItem } from '@/components/admin/GalleryEditor';
import { ArticleEnhancer } from '@/components/blog/ArticleEnhancer';
import { slugify, SLUG_RE } from '@/lib/utils';

export type PostForm = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topicId: string;
  seriesId: string;
  seriesOrder: string;
  cover: GalleryItem | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  tags: string[];
  projectIds: string[];
};

type Revision = { id: string; title: string; reason: string; createdAt: string };

export function PostEditor({
  initial,
  topics,
  series,
  projects,
  takenSlugs,
}: {
  initial: PostForm;
  topics: { id: string; name: string }[];
  series: { id: string; title: string }[];
  projects: { id: string; title: string }[];
  takenSlugs: string[];
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [preview, setPreview] = useState<{
    html: string;
    readingMinutes: number;
    hasMermaid: boolean;
  }>({ html: '', readingMinutes: 0, hasMermaid: false });
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [saveState, setSaveState] = useState<string>(
    initial.id ? 'All changes saved' : 'New draft — not saved yet',
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [restore, setRestore] = useState<Revision | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const slugError = !f.slug
    ? 'Required'
    : !SLUG_RE.test(f.slug)
      ? 'Lowercase letters, numbers and hyphens only'
      : takenSlugs.includes(f.slug)
        ? 'Another post already uses this slug'
        : undefined;

  // Live preview (debounced) — rendered by the same sanitising pipeline as the public site.
  useEffect(() => {
    const t = window.setTimeout(async () => {
      try {
        const r = await api<{ html: string; readingMinutes: number; hasMermaid: boolean }>(
          '/api/admin/preview',
          { method: 'POST', body: { content: f.content } },
        );
        setPreview(r);
      } catch {
        /* keep last preview */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [f.content, api]);

  // Autosave existing posts 2.5 s after the last edit (drafts in place; published → revision only).
  useEffect(() => {
    if (!f.id || !dirty) return;
    const t = window.setTimeout(async () => {
      try {
        setSaveState('Autosaving…');
        const r = await api<{ mode: 'draft' | 'revision'; savedAt: string }>(
          `/api/admin/posts/${f.id}/autosave`,
          {
            method: 'POST',
            body: { title: f.title || 'Untitled', excerpt: f.excerpt, content: f.content },
          },
        );
        setSaveState(
          r.mode === 'draft'
            ? `Draft autosaved at ${new Date(r.savedAt).toLocaleTimeString()}`
            : `Autosaved as a revision at ${new Date(r.savedAt).toLocaleTimeString()} — press Update to publish changes`,
        );
      } catch (e) {
        setSaveState(`Autosave failed: ${errorMessage(e)}`);
      }
    }, 2500);
    return () => window.clearTimeout(t);
  }, [f.id, f.title, f.excerpt, f.content, dirty, api]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !f.id) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, f.id]);

  const loadRevisions = useCallback(async () => {
    if (!f.id) return;
    const r = await api<{ revisions: Revision[] }>(`/api/admin/posts/${f.id}/revisions`);
    setRevisions(r.revisions);
  }, [api, f.id]);
  useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  const save = async (status?: PostForm['status']) => {
    if (slugError) {
      toast(`Slug: ${slugError}`, 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...f,
        status: status ?? f.status,
        coverId: f.cover?.id ?? null,
        topicId: f.topicId || null,
        seriesId: f.seriesId || null,
        seriesOrder: f.seriesOrder || null,
        publishedAt: f.publishedAt || null,
      };
      const r = await api<{ post: { id: string; status: PostForm['status'] } }>(
        f.id ? `/api/admin/posts/${f.id}` : '/api/admin/posts',
        {
          method: f.id ? 'PUT' : 'POST',
          body,
        },
      );
      setF((x) => ({ ...x, id: r.post.id, status: r.post.status }));
      setDirty(false);
      setSaveState(`Saved at ${new Date().toLocaleTimeString()}`);
      toast(status === 'PUBLISHED' ? 'Published' : 'Saved');
      if (!f.id) router.replace(`/admin/posts/${r.post.id}`);
      router.refresh();
      void loadRevisions();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const doRestore = async () => {
    if (!restore || !f.id) return;
    try {
      const r = await api<{ post: { title: string; excerpt: string; content: string } }>(
        `/api/admin/posts/${f.id}/revisions`,
        {
          method: 'POST',
          body: { revisionId: restore.id },
        },
      );
      setF((x) => ({
        ...x,
        title: r.post.title,
        excerpt: r.post.excerpt,
        content: r.post.content,
      }));
      setRestore(null);
      toast('Revision restored');
      void loadRevisions();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const insertAtCursor = (snippet: string) => {
    const el = textRef.current;
    if (!el) return set('content', `${f.content}\n${snippet}\n`);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = f.content.slice(0, start) + snippet + f.content.slice(end);
    set('content', next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  };

  const wrap = (before: string, after = before) => {
    const el = textRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = f.content.slice(s, e) || 'text';
    set('content', f.content.slice(0, s) + before + sel + after + f.content.slice(e));
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
          hint={`/blog/${f.slug || '…'}`}
          onChange={(v) => {
            setSlugTouched(true);
            set('slug', v.toLowerCase());
          }}
        />
      </div>
      <TextArea
        label="Excerpt"
        value={f.excerpt}
        rows={2}
        maxLength={400}
        onChange={(v) => set('excerpt', v)}
        hint="Used on cards, feeds and meta descriptions."
      />

      <section aria-label="Content editor" className="rounded-sm border border-line">
        <div
          className="flex flex-wrap items-center gap-1 border-b border-line p-2"
          role="toolbar"
          aria-label="Formatting"
        >
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => wrap('**')}
            aria-label="Bold"
          >
            B
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2 italic"
            onClick={() => wrap('*')}
            aria-label="Italic"
          >
            I
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('\n## Heading\n')}
          >
            H2
          </button>
          <button type="button" className="btn-ghost btn-sm min-h-9 px-2" onClick={() => wrap('`')}>
            Code
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('\n```python\n# code\n```\n')}
          >
            Block
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('$$\n\\nabla L(\\theta)\n$$')}
          >
            ∑ Math
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('\n> [!NOTE]\n> Callout text\n')}
          >
            Callout
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('\n| A | B |\n| --- | --- |\n| 1 | 2 |\n')}
          >
            Table
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => insertAtCursor('\n```mermaid\nflowchart LR\n  A --> B\n```\n')}
          >
            Diagram
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm min-h-9 px-2"
            onClick={() => setPicker(true)}
          >
            Image
          </button>
          <div className="ml-auto flex gap-1 lg:hidden" role="tablist" aria-label="Editor view">
            {(['write', 'preview'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className="chip min-h-8"
                data-active={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="grid lg:grid-cols-2">
          <div className={view === 'write' ? 'block' : 'hidden lg:block'}>
            <label htmlFor="post-content" className="sr-only">
              Markdown content
            </label>
            <textarea
              id="post-content"
              ref={textRef}
              value={f.content}
              onChange={(e) => set('content', e.target.value)}
              spellCheck
              className="h-[65vh] min-h-[24rem] w-full resize-y bg-surface p-4 font-mono text-sm leading-relaxed text-fg outline-none lg:border-r lg:border-line"
            />
          </div>
          <div className={view === 'preview' ? 'block' : 'hidden lg:block'}>
            <div id="editor-preview" className="h-[65vh] min-h-[24rem] overflow-y-auto p-4">
              <div
                className="article max-w-none"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
              <ArticleEnhancer
                key={preview.html.length}
                rootId="editor-preview"
                hasMermaid={preview.hasMermaid}
              />
            </div>
          </div>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          {preview.readingMinutes} min read · {f.content.split(/\s+/).filter(Boolean).length} words
          · Markdown, KaTeX ($…$, $$…$$), GFM tables, callouts, Mermaid. Raw HTML is stripped.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
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
          <TextField
            label="Publish date"
            type="datetime-local"
            value={f.publishedAt}
            onChange={(v) => set('publishedAt', v)}
            hint="Future dates schedule the post; it stays hidden until then."
          />
          <Toggle label="Featured" checked={f.featured} onChange={(v) => set('featured', v)} />
          <SelectField
            label="Difficulty"
            value={f.difficulty}
            onChange={(v) => set('difficulty', v)}
            options={[
              { value: 'BEGINNER', label: 'Beginner' },
              { value: 'INTERMEDIATE', label: 'Intermediate' },
              { value: 'ADVANCED', label: 'Advanced' },
            ]}
          />
        </Panel>
        <Panel title="Organisation">
          <SelectField
            label="Topic"
            value={f.topicId}
            onChange={(v) => set('topicId', v)}
            options={[
              { value: '', label: '— None —' },
              ...topics.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <SelectField
              label="Series"
              value={f.seriesId}
              onChange={(v) => set('seriesId', v)}
              options={[
                { value: '', label: '— None —' },
                ...series.map((s) => ({ value: s.id, label: s.title })),
              ]}
            />
            <TextField
              label="Part"
              type="number"
              min={1}
              value={f.seriesOrder}
              onChange={(v) => set('seriesOrder', v)}
            />
          </div>
          <TagInput label="Tags" value={f.tags} onChange={(v) => set('tags', v)} />
          <fieldset>
            <legend className="label mb-2">Related projects</legend>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip normal-case"
                  aria-pressed={f.projectIds.includes(p.id)}
                  onClick={() =>
                    set(
                      'projectIds',
                      f.projectIds.includes(p.id)
                        ? f.projectIds.filter((x) => x !== p.id)
                        : [...f.projectIds, p.id],
                    )
                  }
                >
                  {p.title}
                </button>
              ))}
            </div>
          </fieldset>
        </Panel>
        <Panel title="Cover & SEO">
          <MediaSlot
            label="Cover image (optional)"
            value={f.cover}
            onChange={(m) => set('cover', m)}
          />
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
            rows={2}
            onChange={(v) => set('seoDescription', v)}
            hint={`${f.seoDescription.length}/170`}
          />
        </Panel>
      </div>

      {f.id && (
        <Panel
          title="Revisions"
          description="Snapshots are taken on every save, publish and restore (latest 50 kept)."
        >
          {revisions.length === 0 ? (
            <p className="text-sm text-muted">No revisions yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {revisions.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-mono text-xs text-accent">{r.reason}</span> ·{' '}
                    {new Date(r.createdAt).toLocaleString()} ·{' '}
                    <span className="text-muted">{r.title}</span>
                  </span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setRestore(r)}>
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <SaveBar status={saving ? 'Saving…' : saveState}>
        {f.id && (
          <a
            href={`/admin/preview/posts/${f.id}`}
            target="_blank"
            rel="noopener"
            className="btn-ghost btn-sm"
          >
            Full preview
          </a>
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

      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        kinds={['IMAGE']}
        title="Insert image"
        onSelect={(items) =>
          items.forEach((m) =>
            insertAtCursor(`\n![${m.alt || 'Describe the image'}](/media/${m.id}?v=display)\n`),
          )
        }
      />
      <ConfirmDialog
        open={Boolean(restore)}
        title="Restore this revision?"
        confirmLabel="Restore"
        onCancel={() => setRestore(null)}
        onConfirm={doRestore}
      >
        The current content is saved as a revision first, so you can undo this.
      </ConfirmDialog>
    </div>
  );
}
