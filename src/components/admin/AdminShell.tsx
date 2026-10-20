'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ADMIN_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAdmin } from './AdminContext';

export function AdminShell({
  user,
  children,
  badges,
}: {
  user: { name: string; email: string };
  children: ReactNode;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { api, toast } = useAdmin();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      toast('Logout failed', 'error');
    }
    router.replace('/admin/login');
    router.refresh();
  };

  const nav = (
    <nav aria-label="Admin">
      <ul className="space-y-0.5">
        {ADMIN_NAV.map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={active(n.href) ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center justify-between rounded-sm px-3 text-sm transition-colors',
                active(n.href)
                  ? 'bg-signal text-signal-fg'
                  : 'text-fg/80 hover:bg-surface hover:text-fg',
              )}
            >
              {n.label}
              {badges?.[n.href] ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 font-mono text-[0.6rem]',
                    active(n.href) ? 'bg-signal-fg text-signal' : 'bg-blue/20 text-blue',
                  )}
                >
                  {badges[n.href]}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-bg lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-signal focus:px-3 focus:py-2 focus:text-signal-fg"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-3 px-2">
          <LogoMark />
          <span className="font-mono text-mono-xs uppercase tracking-[0.18em] text-muted">
            Lab admin
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 border-t border-line pt-4 text-xs">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted">{user.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link href="/" className="btn-ghost btn-sm flex-1" target="_blank">
              View site ↗
            </Link>
            <ThemeToggle />
          </div>
          <button type="button" onClick={logout} className="btn-ghost btn-sm mt-2 w-full">
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-mono text-mono-xs uppercase text-muted">Admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-expanded={open}
            aria-controls="admin-drawer"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      {open && (
        <div
          id="admin-drawer"
          className="fixed inset-0 z-30 overflow-y-auto bg-bg px-4 pb-8 pt-20 lg:hidden"
        >
          {nav}
          <div className="mt-6 grid gap-2 border-t border-line pt-4">
            <Link href="/" className="btn-ghost btn-sm">
              View site ↗
            </Link>
            <button type="button" onClick={logout} className="btn-ghost btn-sm">
              Log out
            </button>
          </div>
        </div>
      )}

      <main
        id="admin-main"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-10"
      >
        {children}
      </main>
    </div>
  );
}
