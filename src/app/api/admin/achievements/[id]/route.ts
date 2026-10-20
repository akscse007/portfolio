import { z } from 'zod';
import { adminRoute, json, readJson } from '@/lib/api';
import { achievementSchema, publishStatus } from '@/lib/validation/schemas';
import {
  deleteAchievement,
  getAchievementAdmin,
  saveAchievement,
  setAchievementStatus,
} from '@/server/services/achievements';

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { params }) =>
  json({ achievement: await getAchievementAdmin(params.id) }),
);

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const input = achievementSchema.parse(await readJson(req));
  return json({ achievement: await saveAchievement(input, session.user.id, params.id) });
});

export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const { status } = z.object({ status: publishStatus }).parse(await readJson(req));
  return json({ achievement: await setAchievementStatus(params.id, status, session.user.id) });
});

export const DELETE = adminRoute<P>(async (req, { session, params }) => {
  await deleteAchievement(params.id, session.user.id, {
    deleteFiles: req.nextUrl.searchParams.get('deleteFiles') === '1',
  });
  return json({ ok: true });
});
