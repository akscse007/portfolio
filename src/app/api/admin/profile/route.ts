import { adminRoute, json, readJson } from '@/lib/api';
import { profileSchema } from '@/lib/validation/schemas';
import { saveProfile } from '@/server/services/content';

export const PUT = adminRoute(async (req, { session }) => {
  const input = profileSchema.parse(await readJson(req, 200_000));
  return json({ profile: await saveProfile(input, session.user.id) });
});
