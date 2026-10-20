'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/markdown';
import { cn } from '@/lib/utils';

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((x): x is HTMLElement => Boolean(x));
    if (!headings.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-1 text-sm">
      {items.map((i) => (
        <li key={i.id} className={i.depth === 3 ? 'pl-4' : ''}>
          <a
            href={`#${i.id}`}
            aria-current={active === i.id ? 'location' : undefined}
            className={cn(
              'block border-l py-1 pl-3 transition-colors',
              active === i.id ? 'border-accent text-fg' : 'border-line text-muted hover:text-fg',
            )}
          >
            {i.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <details className="rounded-sm border border-line px-4 py-3 lg:hidden">
        <summary className="label cursor-pointer select-none py-1">On this page</summary>
        <nav aria-label="Table of contents" className="mt-3">
          {list}
        </nav>
      </details>
      <nav aria-label="Table of contents" className="hidden lg:block">
        <p className="label mb-3">On this page</p>
        {list}
      </nav>
    </>
  );
}
