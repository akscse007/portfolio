import Link from 'next/link';
import type { Metadata } from 'next';
import { LogoMark } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

/** 404 — returned with a real 404 status for unknown routes and unpublished content. */
export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-bg">
      <div className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Home">
          <LogoMark />
        </Link>
      </div>
      <div className="container-page flex flex-1 flex-col justify-center py-16">
        <p className="section-index">
          <span className="text-accent">404</span> — Undefined
        </p>
        <h1
          className="mt-6 font-display text-display-xl font-bold uppercase"
          style={{ fontStretch: '66%' }}
        >
          f(x) is
          <br />
          <span className="font-serif font-normal normal-case italic text-accent">
            undefined here.
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-fg/80">
          This page does not exist, was moved, or is not published yet. The limit exists — it just
          isn&rsquo;t at this address.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Back to the lab
          </Link>
          <Link href="/work" className="btn-ghost">
            Projects
          </Link>
          <Link href="/blog" className="btn-ghost">
            Notes
          </Link>
        </div>
      </div>
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute -right-20 bottom-0 w-[70vw] max-w-3xl text-line"
      >
        <path
          d="M0 100 C 60 100, 90 20, 150 20 L 150 180 C 210 180, 240 100, 400 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="150" cy="20" r="4" fill="none" stroke="rgb(var(--c-signal))" />
        <circle cx="150" cy="180" r="4" fill="rgb(var(--c-signal))" />
      </svg>
    </main>
  );
}
