import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminHeader, Panel, StatusPill } from '@/components/admin/fields';
import { AchievementEditor, type AchievementForm } from '../AchievementEditor';
import { AssetsManager } from '../AssetsManager';

export const metadata = { title: 'Edit achievement' };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, projects, posts] = await Promise.all([
    prisma.achievement.findUnique({
      where: { id },
      include: {
        assets: { orderBy: [{ role: 'asc' }, { order: 'asc' }], include: { media: true } },
        tags: { include: { tag: true } },
        projects: { select: { projectId: true } },
        posts: { select: { postId: true } },
      },
    }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.post.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  if (!a) notFound();
  const initial: AchievementForm = {
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    issuer: a.issuer,
    recipientName: a.recipientName,
    issueDate: day(a.issueDate),
    dateLabel: a.dateLabel ?? '',
    expirationDate: day(a.expirationDate),
    credentialId: a.credentialId ?? '',
    verificationUrl: a.verificationUrl ?? '',
    summary: a.summary,
    context: a.context,
    learned: a.learned,
    skillsCovered: a.skillsCovered,
    status: a.status,
    featured: a.featured,
    order: a.order,
    showCredentialId: a.showCredentialId,
    showVerification: a.showVerification,
    showRecipient: a.showRecipient,
    documentPublic: a.documentPublic,
    previewApproved: a.previewApproved,
    verified: a.verified,
    seoTitle: a.seoTitle ?? '',
    seoDescription: a.seoDescription ?? '',
    canonicalUrl: a.canonicalUrl ?? '',
    tags: a.tags.map((t) => t.tag.name),
    projectIds: a.projects.map((p) => p.projectId),
    postIds: a.posts.map((p) => p.postId),
  };
  return (
    <div className="grid gap-8">
      <AdminHeader
        title={a.title}
        description={
          <span className="inline-flex items-center gap-2">
            Achievement record <StatusPill status={a.status} />
          </span>
        }
      />
      <Panel
        title="Certificate & images"
        description="Originals are stored privately. Public copies follow the approval toggles below."
      >
        <AssetsManager achievementId={a.id} assets={a.assets} />
      </Panel>
      <AchievementEditor
        initial={initial}
        projects={projects}
        posts={posts}
        hasAssets={a.assets.length > 0}
      />
    </div>
  );
}
