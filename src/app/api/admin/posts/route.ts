import { adminRoute, json, readJson } from '@/lib/api';
import { postSchema } from '@/lib/validation/schemas';
import { listPostsAdmin, savePost } from '@/server/services/posts';

export const GET = adminRoute(async () => json({ posts: await listPostsAdmin() }));

export const POST = adminRoute(async (req, { session }) => {
  const input = postSchema.parse(await readJson(req, 2_000_000));
  return json({ post: await savePost(input, session.user.id) }, { status: 201 });
});
