import { adminRoute, json, readJson } from '@/lib/api';
import { libraryNoteSchema } from '@/lib/validation/schemas';
import { listLibraryNotesAdmin, saveLibraryNote } from '@/server/services/library';

export const GET = adminRoute(async () => json({ notes: await listLibraryNotesAdmin() }));

export const POST = adminRoute(async (req, { session }) => {
  const input = libraryNoteSchema.parse(await readJson(req, 2_000_000));
  const note = await saveLibraryNote(input, session.user.id);
  return json({ note }, { status: 201 });
});
