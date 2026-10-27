import { adminRoute, json, readJson } from '@/lib/api';
import { reorderSchema } from '@/lib/validation/schemas';
import { reorderLibraryNotes } from '@/server/services/library';

export const PATCH = adminRoute(async (req, { session }) => {
  const { ids } = reorderSchema.parse(await readJson(req, 50_000));
  await reorderLibraryNotes(ids, session.user.id);
  return json({ ok: true });
});
