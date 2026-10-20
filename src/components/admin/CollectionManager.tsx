'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from './AdminContext';
import { ConfirmDialog, SelectField, TagInput, TextArea, TextField, Toggle } from './fields';
import { slugify } from '@/lib/utils';

export type FieldSpec =
  | {
      key: string;
      label: string;
      type: 'text' | 'url' | 'date' | 'number';
      hint?: string;
      wide?: boolean;
      slugFrom?: string;
    }
  | { key: string; label: string; type: 'textarea'; hint?: string; wide?: boolean }
  | {
      key: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
      hint?: string;
      wide?: boolean;
    }
  | { key: string; label: string; type: 'toggle'; hint?: string; wide?: boolean }
  | { key: string; label: string; type: 'list'; hint?: string; wide?: boolean }
  | { key: string; label: string; type: 'lines'; hint?: string; wide?: boolean };

type Item = Record<string, unknown> & { id?: string };

/**
 * Generic list + inline editor for small collections (experience, education, skills, topics, series).
 * Persists through /api/admin/collections/:collection.
 */
export function CollectionManager({
  collection,
  title,
  fields,
  items: initial,
  empty,
  summary,
  defaults,
}: {
  collection: string;
  title: string;
  fields: FieldSpec[];
  items: Item[];
  empty: Item;
  summary: (item: Item) => { primary: string; secondary?: string };
  defaults?: string;
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [edit, setEdit] = useState<Item | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = (k: string, v: unknown) =>
    setEdit((e) => {
      if (!e) return e;
      const next = { ...e, [k]: v };
      for (const f of fields)
        if ('slugFrom' in f && f.slugFrom === k && !e.id) next[f.key] = slugify(String(v));
      return next;
    });

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const { id, ...body } = edit;
      for (const f of fields) {
        if (f.type === 'date' && !body[f.key]) body[f.key] = null;
        if (f.type === 'lines')
          body[f.key] = ((body[f.key] as string[]) ?? []).map((l) => l.trim()).filter(Boolean);
      }
      const r = await api<{ item: Item }>(
        id ? `/api/admin/collections/${collection}/${id}` : `/api/admin/collections/${collection}`,
        {
          method: id ? 'PUT' : 'POST',
          body,
        },
      );
      const saved = { ...edit, id: r.item.id as string };
      setItems((xs) => (id ? xs.map((x) => (x.id === id ? saved : x)) : [...xs, saved]));
      setEdit(null);
      toast(`${title} saved`);
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
      await api(`/api/admin/collections/${collection}/${del.id}`, { method: 'DELETE' });
      setItems((xs) => xs.filter((x) => x.id !== del.id));
      setDel(null);
      toast('Deleted');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <section
      className="rounded-sm border border-line p-4 sm:p-6"
      aria-labelledby={`col-${collection}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`col-${collection}`} className="label-accent">
          {title}
        </h2>
        {!edit && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit({ ...empty })}>
            Add
          </button>
        )}
      </div>
      {defaults && <p className="mt-1 text-xs text-muted">{defaults}</p>}

      {edit && (
        <div className="mt-5 grid gap-4 rounded-sm border border-accent/40 p-4 sm:grid-cols-2">
          {fields.map((f) => {
            const v = edit[f.key];
            const cls = f.wide ? 'sm:col-span-2' : undefined;
            switch (f.type) {
              case 'textarea':
                return (
                  <TextArea
                    key={f.key}
                    className={cls}
                    label={f.label}
                    hint={f.hint}
                    value={String(v ?? '')}
                    rows={3}
                    onChange={(x) => setField(f.key, x)}
                  />
                );
              case 'select':
                return (
                  <SelectField
                    key={f.key}
                    className={cls}
                    label={f.label}
                    hint={f.hint}
                    value={String(v ?? '')}
                    options={f.options}
                    onChange={(x) => setField(f.key, x)}
                  />
                );
              case 'toggle':
                return (
                  <Toggle
                    key={f.key}
                    className={cls}
                    label={f.label}
                    hint={f.hint}
                    checked={Boolean(v)}
                    onChange={(x) => setField(f.key, x)}
                  />
                );
              case 'list':
                return (
                  <TagInput
                    key={f.key}
                    className={cls}
                    label={f.label}
                    hint={f.hint}
                    value={(v as string[]) ?? []}
                    onChange={(x) => setField(f.key, x)}
                  />
                );
              case 'lines':
                return (
                  <TextArea
                    key={f.key}
                    className={cls}
                    label={f.label}
                    hint={f.hint ?? 'One item per line.'}
                    rows={4}
                    value={((v as string[]) ?? []).join('\n')}
                    onChange={(x) => setField(f.key, x.split('\n'))}
                  />
                );
              case 'number':
                return (
                  <TextField
                    key={f.key}
                    className={cls}
                    type="number"
                    label={f.label}
                    hint={f.hint}
                    value={String(v ?? 0)}
                    onChange={(x) => setField(f.key, Number(x) || 0)}
                  />
                );
              default:
                return (
                  <TextField
                    key={f.key}
                    className={cls}
                    type={f.type}
                    label={f.label}
                    hint={f.hint}
                    value={String(v ?? '')}
                    onChange={(x) => setField(f.key, x)}
                  />
                );
            }
          })}
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {items.length === 0 && <li className="py-6 text-center text-sm text-muted">None yet.</li>}
        {items.map((it) => {
          const s = summary(it);
          return (
            <li
              key={String(it.id)}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{s.primary}</p>
                {s.secondary && <p className="truncate text-xs text-muted">{s.secondary}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setEdit({ ...it })}
                >
                  Edit
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => setDel(it)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={Boolean(del)}
        title="Delete this entry?"
        danger
        confirmLabel="Delete"
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </section>
  );
}
