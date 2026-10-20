'use client';

import { CollectionManager } from '@/components/admin/CollectionManager';

type Item = Record<string, unknown> & { id?: string };

export function ExperienceCollections({
  experience,
  education,
  skills,
  topics,
  series,
  topicOptions,
}: {
  experience: Item[];
  education: Item[];
  skills: Item[];
  topics: Item[];
  series: Item[];
  topicOptions: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-6">
      <CollectionManager
        collection="experience"
        title="Experience"
        items={experience}
        summary={(i) => ({
          primary: `${i.role} — ${i.organization}`,
          secondary: `${i.period}${i.visible ? '' : ' · hidden'}`,
        })}
        empty={{
          organization: '',
          role: '',
          kind: 'WORK',
          location: '',
          period: '',
          startDate: '',
          endDate: '',
          current: false,
          summary: '',
          highlights: [],
          url: '',
          visible: true,
          order: experience.length,
        }}
        defaults="Only publish details you are authorised to disclose (e.g. research internships)."
        fields={[
          { key: 'role', label: 'Role', type: 'text' },
          { key: 'organization', label: 'Organisation', type: 'text' },
          {
            key: 'kind',
            label: 'Kind',
            type: 'select',
            options: [
              { value: 'WORK', label: 'Work' },
              { value: 'RESEARCH', label: 'Research' },
              { value: 'FREELANCE', label: 'Freelance' },
              { value: 'LEADERSHIP', label: 'Leadership' },
              { value: 'VOLUNTEER', label: 'Volunteer' },
            ],
          },
          { key: 'period', label: 'Period label', type: 'text', hint: 'e.g. “Sep 2025 — Present”' },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'url', label: 'Website', type: 'url' },
          { key: 'startDate', label: 'Start date (for sorting)', type: 'date' },
          { key: 'endDate', label: 'End date', type: 'date' },
          { key: 'summary', label: 'Summary', type: 'textarea', wide: true },
          {
            key: 'highlights',
            label: 'Highlights',
            type: 'lines',
            wide: true,
            hint: 'One highlight per line.',
          },
          { key: 'current', label: 'Current role', type: 'toggle' },
          { key: 'visible', label: 'Visible on site', type: 'toggle' },
          { key: 'order', label: 'Order', type: 'number' },
        ]}
      />
      <CollectionManager
        collection="education"
        title="Education"
        items={education}
        summary={(i) => ({
          primary: String(i.credential),
          secondary: `${i.institution} · ${i.period}${i.result ? ` · ${i.result}` : ''}`,
        })}
        empty={{
          institution: '',
          credential: '',
          period: '',
          result: '',
          note: '',
          visible: true,
          order: education.length,
        }}
        fields={[
          { key: 'credential', label: 'Credential', type: 'text' },
          { key: 'institution', label: 'Institution', type: 'text' },
          { key: 'period', label: 'Period', type: 'text' },
          {
            key: 'result',
            label: 'Result (CGPA / %)',
            type: 'text',
            hint: 'Only verified figures.',
          },
          { key: 'note', label: 'Note', type: 'textarea', wide: true },
          { key: 'visible', label: 'Visible', type: 'toggle' },
          { key: 'order', label: 'Order', type: 'number' },
        ]}
      />
      <CollectionManager
        collection="skills"
        title="Skills"
        items={skills}
        summary={(i) => ({ primary: String(i.name), secondary: String(i.group) })}
        empty={{ name: '', slug: '', group: 'Languages', order: 0 }}
        defaults="Skills link to projects automatically when a project lists the same technology."
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'slug', label: 'Slug', type: 'text', slugFrom: 'name' },
          {
            key: 'group',
            label: 'Group',
            type: 'text',
            hint: 'Languages, Frontend, Backend, Data, AI / ML, DevOps & Tooling…',
          },
          { key: 'order', label: 'Order', type: 'number' },
        ]}
      />
      <CollectionManager
        collection="topics"
        title="Blog topics"
        items={topics}
        summary={(i) => ({ primary: String(i.name), secondary: `${i.group} · /topics/${i.slug}` })}
        empty={{ name: '', slug: '', description: '', group: 'Mathematics', order: topics.length }}
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'slug', label: 'Slug', type: 'text', slugFrom: 'name' },
          { key: 'group', label: 'Group', type: 'text' },
          { key: 'order', label: 'Order', type: 'number' },
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
        ]}
      />
      <CollectionManager
        collection="series"
        title="Lesson series"
        items={series}
        summary={(i) => ({ primary: String(i.title), secondary: String(i.description || '') })}
        empty={{ title: '', slug: '', description: '', topicId: '' }}
        fields={[
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'slug', label: 'Slug', type: 'text', slugFrom: 'title' },
          {
            key: 'topicId',
            label: 'Topic',
            type: 'select',
            options: [{ value: '', label: '— None —' }, ...topicOptions],
          },
          { key: 'description', label: 'Description', type: 'textarea', wide: true },
        ]}
      />
    </div>
  );
}
