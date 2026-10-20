import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { jsonLdString } from '@/lib/seo';

export function SectionHeader({
  index,
  label,
  title,
  intro,
  className,
  as: Heading = 'h2',
  id,
}: {
  index?: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
  as?: 'h1' | 'h2';
  id?: string;
}) {
  return (
    <div className={cn('grid gap-6 md:grid-cols-12 md:gap-8', className)}>
      <div className="flex items-center gap-3 md:col-span-3 md:items-start md:pt-3">
        {index && <span className="font-mono text-mono-xs text-accent">{index}</span>}
        <span className="section-index">{label}</span>
      </div>
      <div className="md:col-span-9">
        <Heading
          id={id}
          className="font-display text-display-md font-semibold uppercase"
          style={{ fontStretch: '78%' }}
        >
          {title}
        </Heading>
        {intro && <div className="mt-6 max-w-2xl text-lg leading-relaxed text-fg/80">{intro}</div>}
      </div>
    </div>
  );
}

export function PageHero({
  index,
  label,
  title,
  intro,
  children,
}: {
  index?: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="container-page relative pb-14 pt-[calc(var(--header-h)+3.5rem)] md:pb-20 md:pt-[calc(var(--header-h)+6rem)]">
      <div className="flex items-center gap-3">
        {index && <span className="font-mono text-mono-xs text-accent">{index}</span>}
        <span className="section-index">{label}</span>
      </div>
      <h1
        className="mt-6 font-display text-display-lg font-bold uppercase"
        style={{ fontStretch: '72%' }}
      >
        {title}
      </h1>
      {intro && (
        <div className="mt-8 max-w-2xl text-lg leading-relaxed text-fg/80 md:text-xl">{intro}</div>
      )}
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'blue' | 'warn';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.08em]',
        tone === 'default' && 'border-line text-muted',
        tone === 'accent' && 'border-accent/50 text-accent',
        tone === 'blue' && 'border-blue/50 text-blue',
        tone === 'warn' && 'border-danger/50 text-danger',
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-sm border border-dashed border-line px-6 py-14 text-center">
      <svg aria-hidden viewBox="0 0 200 60" className="mx-auto mb-6 h-12 w-40 text-line">
        <path
          d="M0 30 Q 25 0 50 30 T 100 30 T 150 30 T 200 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="100" cy="30" r="3" fill="rgb(var(--c-signal))" />
      </svg>
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="label">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {it.href ? (
              <Link href={it.href} className="hover:text-fg">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {it.label}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
  );
}

/** Renders HTML produced by `renderMarkdown` (already sanitised server-side). */
export function Prose({ html, className }: { html: string; className?: string }) {
  return <div className={cn('article', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PrevNext({
  base,
  prev,
  next,
  prevLabel = 'Previous',
  nextLabel = 'Next',
}: {
  base: string;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Adjacent entries" className="grid border-y border-line sm:grid-cols-2">
      <div className="border-line py-6 sm:border-r sm:pr-6">
        {prev && (
          <Link href={`${base}/${prev.slug}`} className="group block">
            <span className="label">← {prevLabel}</span>
            <span className="mt-2 block font-display text-xl font-semibold group-hover:text-accent">
              {prev.title}
            </span>
          </Link>
        )}
      </div>
      <div className="border-t border-line py-6 text-right sm:border-t-0 sm:pl-6">
        {next && (
          <Link href={`${base}/${next.slug}`} className="group block">
            <span className="label">{nextLabel} →</span>
            <span className="mt-2 block font-display text-xl font-semibold group-hover:text-accent">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
