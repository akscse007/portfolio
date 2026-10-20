import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { ExperienceCollections } from './ExperienceCollections';

export const metadata = { title: 'Experience & taxonomy' };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function AdminExperiencePage() {
  const [experience, education, skills, topics, series] = await Promise.all([
    prisma.experience.findMany({ orderBy: { order: 'asc' } }),
    prisma.education.findMany({ orderBy: { order: 'asc' } }),
    prisma.skill.findMany({ orderBy: [{ group: 'asc' }, { order: 'asc' }] }),
    prisma.topic.findMany({ orderBy: [{ group: 'asc' }, { order: 'asc' }] }),
    prisma.series.findMany({ orderBy: { title: 'asc' } }),
  ]);
  return (
    <div>
      <AdminHeader
        title="Experience & education"
        description="CV data shown on /about and /resume, plus skill groups, blog topics and lesson series."
      />
      <ExperienceCollections
        experience={experience.map((e) => ({
          ...e,
          startDate: day(e.startDate),
          endDate: day(e.endDate),
          location: e.location ?? '',
          url: e.url ?? '',
          createdAt: undefined,
          updatedAt: undefined,
        }))}
        education={education.map((e) => ({
          ...e,
          result: e.result ?? '',
          note: e.note ?? '',
          createdAt: undefined,
          updatedAt: undefined,
        }))}
        skills={skills}
        topics={topics}
        series={series.map((s) => ({ ...s, topicId: s.topicId ?? '', createdAt: undefined }))}
        topicOptions={topics.map((t) => ({ value: t.id, label: t.name }))}
      />
    </div>
  );
}
