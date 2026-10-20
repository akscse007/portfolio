import { adminRoute, json, notFound, readJson } from '@/lib/api';
import { COLLECTIONS } from '@/server/services/collections';

export const POST = adminRoute<{ collection: string }>(async (req, { session, params }) => {
  const handler = COLLECTIONS[params.collection];
  if (!handler) throw notFound('Collection');
  const input = handler.schema.parse(await readJson(req));
  return json({ item: await handler.save(input as never, session.user.id) }, { status: 201 });
});
