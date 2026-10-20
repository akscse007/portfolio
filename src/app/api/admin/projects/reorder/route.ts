import { adminRoute, json, readJson } from '@/lib/api';
import { reorderSchema } from '@/lib/validation/schemas';
import { reorderProjects } from '@/server/services/projects';

export const POST = adminRoute(async (req, { session }) => {
  const { ids } = reorderSchema.parse(await readJson(req));
  await reorderProjects(ids, session.user.id);
  return json({ ok: true });
});
