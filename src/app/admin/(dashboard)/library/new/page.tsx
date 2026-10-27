import { AdminHeader } from '@/components/admin/fields';
import { LibraryNoteEditor } from '../LibraryNoteEditor';
import { prisma } from '@/lib/db';

export const metadata = { title: 'New library note' };

export default async function NewLibraryNotePage() {
  const slugs = (
    await prisma.libraryNote.findMany({ select: { slug: true } })
  ).map((n) => n.slug);

  return (
    <div>
      <AdminHeader
        title="New library note"
        description="Upload a PDF and add metadata for the public library."
      />
      <LibraryNoteEditor
        initial={{
          slug: '',
          title: '',
          description: '',
          subject: 'General',
          category: 'Notes',
          academicLevel: 'Undergraduate',
          media: null,
          status: 'DRAFT',
          featured: false,
          order: '0',
          tags: [],
        }}
        takenSlugs={slugs}
      />
    </div>
  );
}
