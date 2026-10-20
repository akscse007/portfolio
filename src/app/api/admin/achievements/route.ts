import { adminRoute, json, readJson } from '@/lib/api';
import { achievementSchema } from '@/lib/validation/schemas';
import { listAchievementsAdmin, saveAchievement } from '@/server/services/achievements';

export const GET = adminRoute(async (req) => {
  const sp = req.nextUrl.searchParams;
  return json({
    achievements: await listAchievementsAdmin({
      q: sp.get('q')?.slice(0, 100) || undefined,
      category: sp.get('category') || undefined,
      status: sp.get('status') || undefined,
    }),
  });
});

export const POST = adminRoute(async (req, { session }) => {
  const input = achievementSchema.parse(await readJson(req));
  return json({ achievement: await saveAchievement(input, session.user.id) }, { status: 201 });
});
