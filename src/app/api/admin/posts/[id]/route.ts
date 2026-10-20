import { z } from 'zod';
import { adminRoute, json, readJson } from '@/lib/api';
import { postSchema, publishStatus } from '@/lib/validation/schemas';
import { deletePost, getPostAdmin, savePost, setPostStatus } from '@/server/services/posts';

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { params }) =>
  json({ post: await getPostAdmin(params.id) }),
);

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const input = postSchema.parse(await readJson(req, 2_000_000));
  return json({ post: await savePost(input, session.user.id, params.id) });
});

export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const { status } = z.object({ status: publishStatus }).parse(await readJson(req));
  return json({ post: await setPostStatus(params.id, status, session.user.id) });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  await deletePost(params.id, session.user.id);
  return json({ ok: true });
});
