import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { ProjectEditor, type ProjectForm } from '../ProjectEditor';

export const metadata = { title: 'Edit project' };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, skills] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        cover: true,
        previewVideo: true,
        skills: { include: { skill: true } },
        tags: { include: { tag: true } },
        media: { orderBy: { order: 'asc' }, include: { media: true } },
      },
    }),
    prisma.skill.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ]);
  if (!p) notFound();
  const initial: ProjectForm = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    summary: p.summary,
    category: p.category as ProjectForm['category'],
    stage: p.stage,
    stageNote: p.stageNote ?? '',
    role: p.role,
    period: p.period,
    problem: p.problem,
    solution: p.solution,
    architecture: p.architecture,
    contribution: p.contribution,
    decisions: p.decisions,
    challenges: p.challenges,
    lessons: p.lessons,
    liveUrl: p.liveUrl ?? '',
    repoUrl: p.repoUrl ?? '',
    cover: p.cover,
    previewVideo: p.previewVideo ?? null,
    accent: p.accent ?? '',
    status: p.status,
    featured: p.featured,
    order: p.order,
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    skills: p.skills.map((s) => s.skill.name),
    tags: p.tags.map((t) => t.tag.name),
    gallery: p.media.map((m) => m.media),
  };
  return (
    <div>
      <AdminHeader
        title={p.title}
        description={
          <span className="inline-flex items-center gap-2">
            Editing project <StatusPill status={p.status} />
          </span>
        }
      />
      <ProjectEditor initial={initial} skillSuggestions={skills.map((s) => s.name)} />
    </div>
  );
}
