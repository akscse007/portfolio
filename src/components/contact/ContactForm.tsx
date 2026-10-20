'use client';

import { useEffect, useRef, useState } from 'react';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string; fields?: Record<string, string> };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const startedAt = useRef<number>(0);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (status.kind === 'ok' || status.kind === 'error') statusRef.current?.focus();
  }, [status.kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, startedAt: startedAt.current }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: { path: string; message: string }[];
      };
      if (res.ok) {
        setStatus({ kind: 'ok' });
        form.reset();
        return;
      }
      const fields = Object.fromEntries((body.details ?? []).map((d) => [d.path, d.message]));
      setStatus({
        kind: 'error',
        message: body.error ?? 'Something went wrong. Please try again.',
        fields,
      });
    } catch {
      setStatus({ kind: 'error', message: 'Network error — check your connection and try again.' });
    }
  }

  const fieldError = (name: string) =>
    status.kind === 'error' ? status.fields?.[name] : undefined;

  if (status.kind === 'ok') {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-sm border border-accent/60 bg-surface p-8 outline-none"
      >
        <p className="label-accent">Message received</p>
        <p className="mt-3 font-display text-3xl font-semibold">
          Thank you — I&rsquo;ll get back to you.
        </p>
        <p className="mt-3 text-muted">
          Your message was stored securely. I usually reply within a few days.
        </p>
        <button
          type="button"
          className="btn-ghost mt-6"
          onClick={() => setStatus({ kind: 'idle' })}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-describedby="contact-privacy">
      {status.kind === 'error' && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-sm border border-danger/60 bg-surface p-4 text-sm text-danger outline-none"
        >
          {status.message}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Your name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          error={fieldError('name')}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          error={fieldError('email')}
        />
      </div>
      <Field
        label="Subject"
        name="subject"
        required
        minLength={3}
        maxLength={150}
        error={fieldError('subject')}
      />
      <div>
        <label htmlFor="message" className="label mb-1.5 block">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={7}
          className="input resize-y"
          aria-invalid={Boolean(fieldError('message'))}
          aria-describedby={fieldError('message') ? 'message-error' : undefined}
        />
        {fieldError('message') && (
          <p id="message-error" className="mt-1.5 text-sm text-danger">
            {fieldError('message')}
          </p>
        )}
      </div>
      {/* Honeypot: hidden from people, tempting for bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={status.kind === 'sending'}>
          {status.kind === 'sending' ? 'Sending…' : 'Send message →'}
        </button>
        <p id="contact-privacy" className="text-xs text-muted">
          Your details are used only to reply. See the{' '}
          <a href="/privacy" className="underline">
            privacy notice
          </a>
          .
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  ...props
}: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label mb-1.5 block">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="input"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
