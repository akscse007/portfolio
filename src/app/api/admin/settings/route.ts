import { adminRoute, json, readJson } from '@/lib/api';
import { settingsSchema } from '@/lib/validation/schemas';
import { saveSettings } from '@/server/services/content';

export const PUT = adminRoute(async (req, { session }) => {
  const input = settingsSchema.parse(await readJson(req));
  return json({ settings: await saveSettings(input, session.user.id) });
});
