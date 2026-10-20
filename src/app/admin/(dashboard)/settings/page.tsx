import { prisma } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { AdminHeader } from '@/components/admin/fields';
import { SettingsForm } from './SettingsForm';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  const [s, session] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'default' }, include: { defaultOgImage: true } }),
    getCurrentAdmin(),
  ]);
  const sessions = session
    ? await prisma.session.count({
        where: { userId: session.user.id, expiresAt: { gt: new Date() } },
      })
    : 0;
  const recent = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 });
  return (
    <div className="grid gap-8">
      <AdminHeader
        title="Settings"
        description="Site metadata, social preview, contact form and security."
      />
      <SettingsForm
        initial={{
          siteTitle: s?.siteTitle ?? 'AKASH ROY — DIGITAL LAB',
          siteDescription: s?.siteDescription ?? '',
          siteUrl: s?.siteUrl ?? '',
          defaultOg: s?.defaultOgImage ?? null,
          twitterHandle: s?.twitterHandle ?? '',
          contactEnabled: s?.contactEnabled ?? true,
          contactAutoReply: s?.contactAutoReply ?? false,
          footerNote: s?.footerNote ?? '',
          analyticsNote: s?.analyticsNote ?? '',
        }}
        sessions={sessions}
        environment={{
          storage: process.env.STORAGE_DRIVER || 'local',
          email: process.env.EMAIL_PROVIDER || 'console',
          csp: process.env.CSP_MODE || 'standard',
          contactTo: Boolean(process.env.CONTACT_TO),
        }}
        audit={recent.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
