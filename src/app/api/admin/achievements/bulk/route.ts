import { adminRoute, json, readJson } from '@/lib/api';
import { achievementBulkSchema, reorderSchema } from '@/lib/validation/schemas';
import { bulkUpdateAchievements, reorderAchievements } from '@/server/services/achievements';

/** POST { ids, patch } — bulk category / status / featured / visibility changes. */
export const POST = adminRoute(async (req, { session }) => {
  const { ids, patch } = achievementBulkSchema.parse(await readJson(req));
  const count = await bulkUpdateAchievements(ids, patch, session.user.id);
  return json({ ok: true, count });
});

/** PUT { ids } — save custom display order. */
export const PUT = adminRoute(async (req, { session }) => {
  const { ids } = reorderSchema.parse(await readJson(req));
  await reorderAchievements(ids, session.user.id);
  return json({ ok: true });
});
