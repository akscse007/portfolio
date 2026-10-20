'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Wordmark } from '@/components/brand/Logo';
import { ThemeToggle } from './ThemeToggle';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close on navigation
  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Escape, focus trap and scroll lock while the mobile menu is open
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const focusables = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-base',
          scrolled || open
            ? 'border-b border-line/70 bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70'
            : 'border-b border-transparent',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container-page flex h-header items-center justify-between gap-4">
          <Link
            href="/"
            className="relative z-10 -m-2 shrink-0 rounded-sm p-2"
            aria-label="Akash Roy — Digital Lab, home"
          >
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'group relative inline-flex min-h-11 items-center px-2.5 font-mono text-mono-sm uppercase transition-colors duration-fast',
                      isActive(item.href) ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    <span className="mr-1.5 text-[0.6rem] text-accent opacity-0 transition-opacity group-hover:opacity-100 group-aria-[current=page]:opacity-100">
                      {item.index}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative z-10 flex items-center gap-1">
            <ThemeToggle />
            <button
              ref={buttonRef}
              type="button"
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 font-mono text-mono-sm uppercase xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="sr-only xs:not-sr-only">{open ? 'Close' : 'Menu'}</span>
              <span aria-hidden className="relative block h-3 w-5">
                <span
                  className={cn(
                    'absolute left-0 top-0 h-px w-full bg-current transition-transform duration-base ease-out-expo',
                    open && 'translate-y-1.5 rotate-45',
                  )}
                />
                <span
                  className={cn(
                    'absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-base ease-out-expo',
                    open && '-translate-y-1.5 -rotate-45',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!open}
        className="fixed inset-0 z-40 overflow-y-auto bg-bg xl:hidden"
        style={{ paddingTop: 'calc(var(--header-h) + env(safe-area-inset-top))' }}
      >
        <nav
          aria-label="Mobile"
          className="container-page flex min-h-full flex-col justify-between pb-10 pt-6"
        >
          <ul className="border-t border-line">
            {NAV.map((item, i) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className="flex min-h-14 items-baseline gap-4 py-3 animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-mono text-mono-xs text-accent">{item.index}</span>
                  <span
                    className={cn(
                      'font-display text-4xl font-semibold uppercase tracking-tight xs:text-5xl',
                      isActive(item.href) ? 'text-accent' : 'text-fg',
                    )}
                    style={{ fontStretch: '75%' }}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="label mt-10">Kolkata, India · Mathematics → Intelligent software</p>
        </nav>
      </div>
    </>
  );
}
