import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ScrollProgress } from '@/components/layout/ScrollProgress';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { getProfile, getSettings } from '@/server/repos/public';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return (
    <MotionProvider>
      <a
        href="#main"
        className="sr-only z-[100] rounded-sm bg-signal px-4 py-3 font-mono text-mono-sm uppercase text-signal-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter profile={profile} note={settings?.footerNote} />
    </MotionProvider>
  );
}
