import { adminRoute, json, readJson } from '@/lib/api';
import { messageUpdateSchema } from '@/lib/validation/schemas';
import { deleteMessage, setMessageStatus } from '@/server/services/content';

type P = { id: string };

export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const { status } = messageUpdateSchema.parse(await readJson(req));
  return json({ message: await setMessageStatus(params.id, status, session.user.id) });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  await deleteMessage(params.id, session.user.id);
  return json({ ok: true });
});
