import { adminRoute, json, readJson } from '@/lib/api';
import { cropSchema } from '@/lib/validation/schemas';
import { cropAchievementPreview } from '@/server/services/achievements';

/** Creates a new PREVIEW image from a crop of an attached original. The original is untouched. */
export const POST = adminRoute<{ id: string }>(async (req, { session, params }) => {
  const { mediaId, x, y, width, height, alt } = cropSchema.parse(await readJson(req));
  const media = await cropAchievementPreview(
    params.id,
    mediaId,
    { x, y, width, height },
    session.user.id,
    alt,
  );
  return json({ media }, { status: 201 });
});
