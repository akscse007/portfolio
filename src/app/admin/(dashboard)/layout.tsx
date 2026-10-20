import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminProvider } from '@/components/admin/AdminContext';
import { AdminShell } from '@/components/admin/AdminShell';

/** Every dashboard page is gated server-side; middleware only provides a fast redirect. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentAdmin();
  if (!session) redirect('/admin/login');
  const newMessages = await prisma.contactMessage.count({ where: { status: 'NEW' } });
  return (
    <AdminProvider csrfToken={session.csrfToken}>
      <AdminShell user={session.user} badges={{ '/admin/messages': newMessages }}>
        {children}
      </AdminShell>
    </AdminProvider>
  );
}
