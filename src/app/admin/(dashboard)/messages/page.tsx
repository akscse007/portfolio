import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { Inbox } from './Inbox';

export const metadata = { title: 'Messages' };

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const { open } = await searchParams;
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return (
    <div>
      <AdminHeader
        title="Messages"
        description="Contact form submissions. Visitor IPs are stored only as salted hashes."
      />
      <Inbox
        initialOpen={open ?? null}
        initial={messages.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          subject: m.subject,
          body: m.body,
          status: m.status,
          emailSent: m.emailSent,
          emailError: m.emailError,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
