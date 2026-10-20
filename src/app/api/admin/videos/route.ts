import { adminRoute, json, readJson } from '@/lib/api';
import { videoSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db';
import { saveVideo } from '@/server/services/content';

export const GET = adminRoute(async () =>
  json({
    videos: await prisma.video.findMany({
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      include: { tags: { include: { tag: true } } },
    }),
  }),
);

export const POST = adminRoute(async (req, { session }) => {
  const input = videoSchema.parse(await readJson(req, 300_000));
  return json({ video: await saveVideo(input, session.user.id) }, { status: 201 });
});
