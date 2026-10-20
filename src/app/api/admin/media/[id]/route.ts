import { adminRoute, HttpError, json, readJson } from '@/lib/api';
import { prisma } from '@/lib/db';
import { mediaUpdateSchema } from '@/lib/validation/schemas';
import { deleteMediaAsset, mediaUsage, recomputeMediaVisibility } from '@/server/services/media';
import { audit, revalidate } from '@/server/services/common';
import { TAGS } from '@/server/repos/public';

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { params }) => {
  const media = await prisma.mediaAsset.findUnique({ where: { id: params.id } });
  if (!media) throw new HttpError(404, 'Media not found');
  return json({ media, usage: await mediaUsage(params.id) });
});

/**
 * PATCH { alt, caption, visibility }.
 * Visibility of a file that is referenced by content is derived from publication state
 * and cannot be overridden manually (prevents accidental exposure of drafts/certificates).
 */
export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const input = mediaUpdateSchema.parse(await readJson(req));
  const usage = await mediaUsage(params.id);
  const media = await prisma.mediaAsset.update({
    where: { id: params.id },
    data: {
      alt: input.alt,
      caption: input.caption ?? null,
      ...(usage.length ? {} : { visibility: input.visibility }),
    },
  });
  if (usage.length) await recomputeMediaVisibility([params.id]);
  await audit(session.user.id, 'update', 'media', params.id);
  revalidate(Object.values(TAGS));
  return json({
    media: await prisma.mediaAsset.findUnique({ where: { id: media.id } }),
    managed: usage.length > 0,
  });
});

export const DELETE = adminRoute<P>(async (req, { session, params }) => {
  const force = req.nextUrl.searchParams.get('force') === '1';
  await deleteMediaAsset(params.id, { force });
  await audit(session.user.id, 'delete', 'media', params.id, { force });
  revalidate(Object.values(TAGS));
  return json({ ok: true });
});
