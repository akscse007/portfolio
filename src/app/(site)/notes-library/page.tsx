import type { Metadata } from 'next';
import { getLibraryNotes } from '@/server/repos/public';
import { pageMetadata } from '@/lib/seo';
import { PageHero, EmptyState } from '@/components/ui/primitives';
import { LibraryIndex } from '@/components/library/LibraryIndex';

export const metadata: Metadata = pageMetadata({
  title: 'PDF Notes Library — Handwritten notes, cheat sheets & study guides',
  description:
    'Free downloadable PDF notes, formula sheets and study guides covering mathematics, computer science and machine learning.',
  path: '/notes-library',
});

export default async function LibraryPage() {
  const notes = await getLibraryNotes();

  return (
    <>
      <PageHero
        index="05"
        label="PDF Library"
        title={
          <>
            Notes for{' '}
            <span className="font-serif font-normal normal-case italic text-accent">juniors</span>
          </>
        }
        intro="Free downloadable PDF notes, formula sheets and study guides — curated to help junior developers and students build strong foundations."
      />

      {notes.length === 0 ? (
        <section className="container-page pb-section">
          <EmptyState title="The library is being prepared">
            Notes will appear here once they are published.
          </EmptyState>
        </section>
      ) : (
        <section aria-labelledby="library-h" className="container-page border-t border-line py-16">
          <h2 id="library-h" className="section-index mb-8">
            All notes
          </h2>
          <LibraryIndex notes={notes} />
        </section>
      )}
    </>
  );
}
