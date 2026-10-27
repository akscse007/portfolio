import 'server-only';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import type { LibraryNoteInput } from '@/lib/validation/schemas';
import { TAGS } from '@/server/repos/public';
import { audit, ensureTags, nextPublishedAt, revalidate } from './common';
import { recomputeMediaVisibility } from './media';

const PATHS = ['/notes-library', '/sitemap.xml'];

export async function listLibraryNotesAdmin() {
  return prisma.libraryNote.findMany({
    orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      subject: true,
      category: true,
      status: true,
      featured: true,
      order: true,
      updatedAt: true,
    },
  });
}

export async function getLibraryNoteAdmin(id: string) {
  const n = await prisma.libraryNote.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      media: { select: { id: true, kind: true, alt: true, originalName: true, mimeType: true, sizeBytes: true } },
    },
  });
  if (!n) throw new HttpError(404, 'Library note not found');
  return n;
}

export async function saveLibraryNote(input: LibraryNoteInput, userId: string, id?: string) {
  const existing = id ? await prisma.libraryNote.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Library note not found');
  const beforeMedia = existing ? [existing.mediaId] : [];

  const saved = await prisma.$transaction(async (tx) => {
    const tagIds = await ensureTags(tx, input.tags);
    const { tags: _t, publishedAt: requestedPublishedAt, ...fields } = input;
    const data = {
      ...fields,
      publishedAt: nextPublishedAt(input.status, existing?.publishedAt, requestedPublishedAt ?? null),
    };
    const n = id
      ? await tx.libraryNote.update({ where: { id }, data })
      : await tx.libraryNote.create({ data });
    await tx.libraryNoteTag.deleteMany({ where: { noteId: n.id } });
    if (tagIds.length)
      await tx.libraryNoteTag.createMany({
        data: tagIds.map((tagId) => ({ noteId: n.id, tagId })),
      });
    return n;
  });

  await recomputeMediaVisibility([...beforeMedia, saved.mediaId]);
  await audit(userId, id ? 'update' : 'create', 'library-note', saved.id, { status: saved.status });
  revalidate([TAGS.library], PATHS);
  if (existing && existing.slug !== saved.slug) revalidate([], [`/notes-library`]);
  return saved;
}

export async function setLibraryNoteStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  userId: string,
) {
  const existing = await prisma.libraryNote.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Library note not found');
  const n = await prisma.libraryNote.update({
    where: { id },
    data: { status, publishedAt: nextPublishedAt(status, existing.publishedAt) },
  });
  await recomputeMediaVisibility([n.mediaId]);
  await audit(userId, `status:${status}`, 'library-note', id);
  revalidate([TAGS.library], PATHS);
  return n;
}

export async function deleteLibraryNote(id: string, userId: string) {
  const existing = await prisma.libraryNote.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Library note not found');
  await prisma.libraryNote.delete({ where: { id } });
  await recomputeMediaVisibility([existing.mediaId]);
  await audit(userId, 'delete', 'library-note', id, { slug: existing.slug });
  revalidate([TAGS.library], PATHS);
  return existing;
}

export async function reorderLibraryNotes(ids: string[], userId: string) {
  await prisma.$transaction(
    ids.map((id, order) => prisma.libraryNote.update({ where: { id }, data: { order } })),
  );
  await audit(userId, 'reorder', 'library-note', null, { count: ids.length });
  revalidate([TAGS.library], PATHS);
}
