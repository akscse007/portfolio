import { adminRoute, json, notFound, readJson } from '@/lib/api';
import { COLLECTIONS } from '@/server/services/collections';

type P = { collection: string; id: string };

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const handler = COLLECTIONS[params.collection];
  if (!handler) throw notFound('Collection');
  const input = handler.schema.parse(await readJson(req));
  return json({ item: await handler.save(input as never, session.user.id, params.id) });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  const handler = COLLECTIONS[params.collection];
  if (!handler) throw notFound('Collection');
  await handler.remove(params.id, session.user.id);
  return json({ ok: true });
});
