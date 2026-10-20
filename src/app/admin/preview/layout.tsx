import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentAdmin } from '@/lib/auth';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ScrollProgress } from '@/components/layout/ScrollProgress';

export const metadata = { title: 'Preview', robots: { index: false, follow: false } };

/** Owner-only previews of unpublished content, rendered with the public layout components. */
export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentAdmin();
  if (!session) redirect('/admin/login');
  return (
    <MotionProvider>
      <ScrollProgress />
      <SiteHeader />
      <main id="main">{children}</main>
    </MotionProvider>
  );
}
