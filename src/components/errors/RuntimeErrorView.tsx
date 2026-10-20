'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Root boundary renders its own <main>; nested boundaries render inside the site layout's <main>. */
  as?: 'main' | 'div';
};

/**
 * Shared runtime-error screen.
 * - Server errors carry a `digest`, which is also logged server-side by `instrumentation.ts`
 *   (correlation ID). Production shows only the reference; development shows message and stack.
 * - "Try again" re-requests server data (router.refresh) and re-renders the segment (reset), so it
 *   can recover from transient server failures, not only client render errors.
 */
export function RuntimeErrorView({ error, reset, as: Tag = 'main' }: Props) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  const isServer = Boolean(error.digest);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Client-side diagnostics (the server-side record is written by instrumentation.onRequestError).
    console.error(`[digital-lab] ${isServer ? 'server' : 'client'} render error`, {
      digest: error.digest,
      path: window.location.pathname,
      error,
    });
  }, [error, isServer]);

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <Tag
      {...(Tag === 'main' ? { id: 'main' } : {})}
      role="alert"
      className="container-page flex min-h-[80svh] flex-col justify-center py-24"
    >
      <p className="section-index">
        <span className="text-danger">500</span> — {isServer ? 'Server error' : 'Runtime error'}
      </p>
      <h1
        className="mt-6 font-display text-display-md font-bold uppercase"
        style={{ fontStretch: '70%' }}
      >
        Something diverged.
      </h1>
      <p className="mt-6 max-w-xl text-fg/80">
        {isServer
          ? 'The server could not render this page. The error has been logged with the reference below.'
          : 'Something went wrong while displaying this page in your browser.'}{' '}
        You can retry, or head back to safer ground.
      </p>
      {error.digest && <p className="annot mt-4">Reference: {error.digest}</p>}
      {isDev && (
        <details open className="mt-6 max-w-3xl rounded-sm border border-danger/40 bg-surface p-4">
          <summary className="label cursor-pointer text-danger">Development details</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-fg/80">
            {error.message}
            {error.stack ? `\n\n${error.stack.split('\n').slice(1, 8).join('\n')}` : ''}
          </pre>
          {isServer && (
            <p className="mt-2 text-xs text-muted">
              Full server stack trace: see the terminal running Next.js (digest {error.digest}).
            </p>
          )}
        </details>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={retry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
        <Link href="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </Tag>
  );
}
