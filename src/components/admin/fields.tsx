'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAdmin } from './AdminContext';

export function FieldShell({
  label,
  hint,
  error,
  children,
  id,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  className,
  ...props
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} className={className}>
      <input
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  rows = 4,
  className,
  mono,
  ...props
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  rows?: number;
  className?: string;
  mono?: boolean;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={cn('input resize-y', mono && 'font-mono text-sm')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} id={id} className={className}>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  className,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-signal bg-signal' : 'border-line bg-surface',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full transition-transform',
            checked ? 'translate-x-6 bg-signal-fg' : 'translate-x-1 bg-muted',
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** Comma/Enter separated tag input stored as string[]. */
export function TagInput({
  label,
  value,
  onChange,
  hint,
  suggestions = [],
  className,
}: {
  label: ReactNode;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: ReactNode;
  suggestions?: string[];
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  };
  return (
    <FieldShell label={label} hint={hint} id={id} className={className}>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1.5 focus-within:border-accent">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              className="text-muted hover:text-danger"
              onClick={() => onChange(value.filter((x) => x !== t))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          list={suggestions.length ? `${id}-list` : undefined}
          value={draft}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length)
              onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-base outline-none sm:text-sm"
          placeholder="Type and press Enter"
        />
        {suggestions.length > 0 && (
          <datalist id={`${id}-list`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
    </FieldShell>
  );
}

/** Markdown textarea with a server-rendered preview tab (same sanitised pipeline as the public site). */
export function MarkdownField({
  label,
  value,
  onChange,
  rows = 8,
  hint = 'Markdown with GFM tables, $LaTeX$, code blocks, > [!NOTE] callouts and ```mermaid diagrams.',
  className,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: ReactNode;
  className?: string;
}) {
  const { api } = useAdmin();
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [html, setHtml] = useState('');
  const id = useId();
  useEffect(() => {
    if (tab !== 'preview') return;
    let alive = true;
    api<{ html: string }>('/api/admin/preview', { method: 'POST', body: { content: value } })
      .then((r) => alive && setHtml(r.html))
      .catch(() => alive && setHtml('<p>Preview unavailable.</p>'));
    return () => {
      alive = false;
    };
  }, [tab, value, api]);
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <div role="tablist" aria-label="Editor mode" className="flex gap-1">
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="chip min-h-8"
              data-active={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === 'write' ? (
        <textarea
          id={id}
          rows={rows}
          className="input resize-y font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          className="article max-w-none rounded-sm border border-line bg-surface p-4"
          dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted">Rendering…</p>' }}
        />
      )}
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

/** Accessible confirmation modal built on the native <dialog> element. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="w-[min(30rem,calc(100vw-2rem))] rounded-sm border border-line bg-elevated p-0 text-fg backdrop:bg-black/60"
      aria-labelledby="confirm-title"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="font-display text-xl font-semibold">
          {title}
        </h2>
        {children && <div className="mt-3 text-sm text-fg/80">{children}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'PUBLISHED'
      ? 'border-accent/60 text-accent'
      : status === 'ARCHIVED'
        ? 'border-line text-muted'
        : status === 'NEW'
          ? 'border-blue/60 text-blue'
          : status === 'SPAM'
            ? 'border-danger/60 text-danger'
            : 'border-line text-fg/80';
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.08em] ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function SaveBar({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="text-xs text-muted" aria-live="polite">
        {status}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1
          className="font-display text-3xl font-bold uppercase md:text-4xl"
          style={{ fontStretch: '78%' }}
        >
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  description,
}: {
  title: string;
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-line bg-surface/40 p-4 sm:p-6">
      <h2 className="label-accent">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}
