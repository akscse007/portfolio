import { z } from 'zod';
import { adminRoute, json, readJson } from '@/lib/api';
import { achievementAssetSchema, cuidLike, reorderSchema } from '@/lib/validation/schemas';
import {
  attachAchievementAsset,
  detachAchievementAsset,
  reorderAchievementAssets,
  replaceAchievementAsset,
} from '@/server/services/achievements';

type P = { id: string };

/** POST { mediaId, role } — attach an uploaded file to the achievement. */
export const POST = adminRoute<P>(async (req, { session, params }) => {
  const { mediaId, role } = achievementAssetSchema.parse(await readJson(req));
  return json(
    { asset: await attachAchievementAsset(params.id, mediaId, role, session.user.id) },
    { status: 201 },
  );
});

/** PUT { ids } — reorder; or { assetId, mediaId } — replace while keeping metadata. */
export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const body = await readJson(req);
  const replace = z.object({ assetId: cuidLike, mediaId: cuidLike }).safeParse(body);
  if (replace.success) {
    await replaceAchievementAsset(
      params.id,
      replace.data.assetId,
      replace.data.mediaId,
      session.user.id,
    );
    return json({ ok: true });
  }
  const { ids } = reorderSchema.parse(body);
  await reorderAchievementAssets(params.id, ids, session.user.id);
  return json({ ok: true });
});

/** DELETE ?assetId= — detach (the file stays in the media library). */
export const DELETE = adminRoute<P>(async (req, { session, params }) => {
  const assetId = cuidLike.parse(req.nextUrl.searchParams.get('assetId'));
  await detachAchievementAsset(params.id, assetId, session.user.id);
  return json({ ok: true });
});
