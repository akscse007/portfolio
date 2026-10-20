import { adminRoute, json } from '@/lib/api';
import { findOrphans } from '@/server/services/media';
import { audit } from '@/server/services/common';

/** GET — dry run; POST — delete unreferenced files older than 24h and stray storage objects. */
export const GET = adminRoute(async () => json(await findOrphans({ apply: false })));

export const POST = adminRoute(async (_req, { session }) => {
  const result = await findOrphans({ apply: true });
  await audit(session.user.id, 'cleanup-orphans', 'media', null, {
    stray: result.strayObjects.length,
    unreferenced: result.unreferenced.length,
  });
  return json(result);
});
