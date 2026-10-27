import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { LibraryNoteEditor } from '../LibraryNoteEditor';
import { getLibraryNoteAdmin } from '@/server/services/library';

export const metadata = { title: 'Edit library note' };

export default async function EditLibraryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, slugs] = await Promise.all([
    getLibraryNoteAdmin(id).catch(() => null),
    prisma.libraryNote.findMany({ where: { id: { not: id } }, select: { slug: true } }),
  ]);
  if (!note) notFound();

  return (
    <div>
      <AdminHeader
        title={note.title}
        description={`/notes-library · ${note.slug}`}
        actions={<StatusPill status={note.status} />}
      />
      <LibraryNoteEditor
        initial={{
          id: note.id,
          slug: note.slug,
          title: note.title,
          description: note.description,
          subject: note.subject,
          category: note.category,
          academicLevel: note.academicLevel,
          media: note.media
            ? {
                id: note.media.id,
                kind: note.media.kind as 'PDF',
                alt: note.media.alt,
                originalName: note.media.originalName,
                mimeType: note.media.mimeType,
              }
            : null,
          status: note.status,
          featured: note.featured,
          order: String(note.order),
          tags: note.tags.map((t) => t.tag.name),
        }}
        takenSlugs={slugs.map((s) => s.slug)}
      />
    </div>
  );
}
