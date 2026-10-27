import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { ProjectEditor } from '../ProjectEditor';

export const metadata = { title: 'New project' };

export default async function NewProjectPage() {
  const skills = await prisma.skill.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
  return (
    <div>
      <AdminHeader
        title="New project"
        description="Projects start as drafts. Only publish facts you can stand behind."
      />
      <ProjectEditor
        skillSuggestions={skills.map((s) => s.name)}
        initial={{
          slug: '',
          title: '',
          subtitle: '',
          summary: '',
          category: 'Full Stack',
          stage: 'IN_PROGRESS',
          stageNote: '',
          role: '',
          period: '',
          problem: '',
          solution: '',
          architecture: '',
          contribution: '',
          decisions: '',
          challenges: '',
          lessons: '',
          liveUrl: '',
          repoUrl: '',
          cover: null,
          previewVideo: null,
          accent: '',
          status: 'DRAFT',
          featured: false,
          order: 0,
          seoTitle: '',
          seoDescription: '',
          skills: [],
          tags: [],
          gallery: [],
        }}
      />
    </div>
  );
}
