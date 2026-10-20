import { z } from 'zod';
import { adminRoute, json, readJson } from '@/lib/api';
import { cuidLike } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db';
import { getRevision, restoreRevision } from '@/server/services/posts';

type P = { id: string };

/** GET — list revisions; GET ?rev=<id> — fetch one revision's content. */
export const GET = adminRoute<P>(async (req, { params }) => {
  const rev = req.nextUrl.searchParams.get('rev');
  if (rev) return json({ revision: await getRevision(params.id, cuidLike.parse(rev)) });
  const revisions = await prisma.postRevision.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, title: true, reason: true, createdAt: true },
  });
  return json({ revisions });
});

/** POST { revisionId } — restore a revision into the post. */
export const POST = adminRoute<P>(async (req, { session, params }) => {
  const { revisionId } = z.object({ revisionId: cuidLike }).parse(await readJson(req));
  return json({ post: await restoreRevision(params.id, revisionId, session.user.id) });
});
