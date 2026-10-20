import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { renderMarkdown } from '@/lib/markdown';
import { achievementDetailInclude, toPublicAchievement } from '@/server/repos/public';
import { AchievementDetailView } from '@/components/achievements/AchievementDetailView';
import { PreviewBanner } from '@/components/admin/PreviewBanner';

export default async function AchievementPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.achievement.findUnique({
    where: { id },
    include: achievementDetailInclude,
  });
  if (!a) notFound();
  const dto = {
    ...toPublicAchievement(a, { includePrivate: true }),
    projects: a.projects.map((p) => p.project),
    posts: a.posts.map((p) => p.post),
    prev: null,
    next: null,
  };
  const [context, learned] = await Promise.all([
    a.context.trim() ? renderMarkdown(a.context) : null,
    a.learned.trim() ? renderMarkdown(a.learned) : null,
  ]);
  const notes = [
    a.previewApproved
      ? 'Preview images approved'
      : 'Preview NOT approved — images shown here stay private when published',
    a.documentPublic ? 'Original document public' : 'Original document private',
    a.showCredentialId ? 'Credential ID shown' : 'Credential ID hidden publicly',
    a.showVerification ? 'Verification link shown' : 'Verification link hidden publicly',
  ];
  return (
    <>
      <AchievementDetailView a={dto} context={context} learned={learned} />
      <div className="h-28" />
      <PreviewBanner status={a.status} editHref={`/admin/achievements/${a.id}`} notes={notes} />
    </>
  );
}
