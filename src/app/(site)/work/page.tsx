import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHero } from '@/components/ui/primitives';
import { ProjectIndex } from '@/components/work/ProjectIndex';
import { getProjects } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PROJECT_CATEGORIES } from '@/lib/validation/schemas';

export const metadata: Metadata = pageMetadata({
  title: 'Work — Project Laboratory',
  description:
    'Full-stack platforms, AI/ML systems, research prototypes and developer tools by Akash Roy.',
  path: '/work',
});

export default async function WorkPage() {
  const projects = await getProjects();
  const categories = PROJECT_CATEGORIES.filter((c) => projects.some((p) => p.category === c));
  return (
    <>
      <PageHero
        index="01"
        label="Project laboratory"
        title={
          <>
            The <span className="font-serif font-normal normal-case italic text-accent">work</span>
          </>
        }
        intro="Production platforms, AI-assisted tools and research prototypes. Each entry states plainly whether it is live, a demonstration or work in progress."
      />
      <section className="container-page pb-section" aria-label="Projects">
        <Suspense fallback={<div className="skeleton h-96 rounded-sm" />}>
          <ProjectIndex projects={projects} categories={[...categories]} />
        </Suspense>
      </section>
    </>
  );
}
