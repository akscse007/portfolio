import { adminRoute, json, readJson } from '@/lib/api';
import { videoSchema } from '@/lib/validation/schemas';
import { deleteVideo, saveVideo } from '@/server/services/content';

type P = { id: string };

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const input = videoSchema.parse(await readJson(req, 300_000));
  return json({ video: await saveVideo(input, session.user.id, params.id) });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  await deleteVideo(params.id, session.user.id);
  return json({ ok: true });
});
