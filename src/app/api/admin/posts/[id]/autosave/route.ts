import { adminRoute, json, readJson } from '@/lib/api';
import { autosaveSchema } from '@/lib/validation/schemas';
import { autosavePost } from '@/server/services/posts';

export const POST = adminRoute<{ id: string }>(async (req, { params }) => {
  const data = autosaveSchema.parse(await readJson(req, 2_000_000));
  return json(await autosavePost(params.id, data));
});
