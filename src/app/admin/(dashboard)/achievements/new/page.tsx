import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { AchievementEditor } from '../AchievementEditor';

export const metadata = { title: 'New achievement' };

export default async function NewAchievementPage() {
  const [projects, posts] = await Promise.all([
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.post.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  return (
    <div>
      <AdminHeader
        title="New achievement"
        description="Save the record first, then attach the certificate, preview and photos."
      />
      <AchievementEditor
        projects={projects}
        posts={posts}
        hasAssets={false}
        initial={{
          slug: '',
          title: '',
          category: 'COURSE_SPECIALIZATION',
          issuer: '',
          recipientName: 'Akash Roy',
          issueDate: '',
          dateLabel: '',
          expirationDate: '',
          credentialId: '',
          verificationUrl: '',
          summary: '',
          context: '',
          learned: '',
          skillsCovered: [],
          status: 'DRAFT',
          featured: false,
          order: 0,
          showCredentialId: false,
          showVerification: false,
          showRecipient: true,
          documentPublic: false,
          previewApproved: false,
          verified: false,
          seoTitle: '',
          seoDescription: '',
          canonicalUrl: '',
          tags: [],
          projectIds: [],
          postIds: [],
        }}
      />
    </div>
  );
}
