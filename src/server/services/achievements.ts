import 'server-only';
import type { AchievementAssetRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import type { AchievementInput } from '@/lib/validation/schemas';
import { TAGS } from '@/server/repos/public';
import { audit, ensureTags, nextPublishedAt, revalidate } from './common';
import {
  createCroppedDerivative,
  deleteMediaAsset,
  mediaUsage,
  recomputeMediaVisibility,
} from './media';

const PATHS = (slug?: string) => [
  '/',
  '/achievements',
  ...(slug ? [`/achievements/${slug}`] : []),
  '/sitemap.xml',
];

export async function listAchievementsAdmin(
  filter: { q?: string; category?: string; status?: string } = {},
) {
  const where: Prisma.AchievementWhereInput = {};
  if (filter.category) where.category = filter.category as Prisma.AchievementWhereInput['category'];
  if (filter.status) where.status = filter.status as Prisma.AchievementWhereInput['status'];
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { issuer: { contains: filter.q, mode: 'insensitive' } },
      { summary: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.achievement.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { updatedAt: 'desc' }],
    include: {
      assets: {
        orderBy: { order: 'asc' },
        include: { media: { select: { id: true, kind: true, visibility: true, alt: true } } },
      },
    },
  });
}

export async function getAchievementAdmin(id: string) {
  const a = await prisma.achievement.findUnique({
    where: { id },
    include: {
      assets: { orderBy: [{ role: 'asc' }, { order: 'asc' }], include: { media: true } },
      tags: { include: { tag: true } },
      projects: { select: { projectId: true } },
      posts: { select: { postId: true } },
    },
  });
  if (!a) throw new HttpError(404, 'Achievement not found');
  return a;
}

async function assetIds(achievementId: string) {
  const rows = await prisma.achievementAsset.findMany({
    where: { achievementId },
    select: { mediaId: true },
  });
  return rows.map((r) => r.mediaId);
}

export async function saveAchievement(input: AchievementInput, userId: string, id?: string) {
  const existing = id ? await prisma.achievement.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Achievement not found');

  const saved = await prisma.$transaction(async (tx) => {
    const tagIds = await ensureTags(tx, input.tags);
    const { tags: _t, projectIds, postIds, ...fields } = input;
    const data = { ...fields, publishedAt: nextPublishedAt(input.status, existing?.publishedAt) };
    const a = id
      ? await tx.achievement.update({ where: { id }, data })
      : await tx.achievement.create({ data });
    await tx.achievementTag.deleteMany({ where: { achievementId: a.id } });
    if (tagIds.length)
      await tx.achievementTag.createMany({
        data: tagIds.map((tagId) => ({ achievementId: a.id, tagId })),
      });
    await tx.achievementProject.deleteMany({ where: { achievementId: a.id } });
    if (projectIds.length)
      await tx.achievementProject.createMany({
        data: projectIds.map((projectId) => ({ achievementId: a.id, projectId })),
        skipDuplicates: true,
      });
    await tx.achievementPost.deleteMany({ where: { achievementId: a.id } });
    if (postIds.length)
      await tx.achievementPost.createMany({
        data: postIds.map((postId) => ({ achievementId: a.id, postId })),
        skipDuplicates: true,
      });
    return a;
  });

  await recomputeMediaVisibility(await assetIds(saved.id));
  await audit(userId, id ? 'update' : 'create', 'achievement', saved.id, { status: saved.status });
  revalidate([TAGS.achievements, TAGS.projects, TAGS.posts], PATHS(saved.slug));
  if (existing && existing.slug !== saved.slug) revalidate([], [`/achievements/${existing.slug}`]);
  return saved;
}

export async function setAchievementStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  userId: string,
) {
  const existing = await prisma.achievement.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Achievement not found');
  const a = await prisma.achievement.update({
    where: { id },
    data: { status, publishedAt: nextPublishedAt(status, existing.publishedAt) },
  });
  await recomputeMediaVisibility(await assetIds(id));
  await audit(userId, `status:${status}`, 'achievement', id);
  revalidate([TAGS.achievements], PATHS(a.slug));
  return a;
}

export async function deleteAchievement(id: string, userId: string, { deleteFiles = false } = {}) {
  const media = await assetIds(id);
  const a = await prisma.achievement.delete({ where: { id } });
  if (deleteFiles) {
    for (const m of media) {
      if ((await mediaUsage(m)).length === 0) await deleteMediaAsset(m).catch(() => undefined);
    }
  } else {
    await recomputeMediaVisibility(media);
  }
  await audit(userId, 'delete', 'achievement', id, { slug: a.slug, deleteFiles });
  revalidate([TAGS.achievements, TAGS.projects, TAGS.posts], PATHS(a.slug));
  return a;
}

export async function bulkUpdateAchievements(
  ids: string[],
  patch: Partial<{
    category: Prisma.AchievementUpdateInput['category'];
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    featured: boolean;
    previewApproved: boolean;
    documentPublic: boolean;
  }>,
  userId: string,
) {
  const rows = await prisma.achievement.findMany({ where: { id: { in: ids } } });
  await prisma.$transaction(
    rows.map((r) =>
      prisma.achievement.update({
        where: { id: r.id },
        data: {
          ...patch,
          ...(patch.status ? { publishedAt: nextPublishedAt(patch.status, r.publishedAt) } : {}),
        } as Prisma.AchievementUpdateInput,
      }),
    ),
  );
  const media = await prisma.achievementAsset.findMany({
    where: { achievementId: { in: ids } },
    select: { mediaId: true },
  });
  await recomputeMediaVisibility(media.map((m) => m.mediaId));
  await audit(userId, 'bulk-update', 'achievement', null, { ids, patch } as Prisma.InputJsonValue);
  revalidate([TAGS.achievements], PATHS());
  return rows.length;
}

export async function reorderAchievements(ids: string[], userId: string) {
  await prisma.$transaction(
    ids.map((id, order) => prisma.achievement.update({ where: { id }, data: { order } })),
  );
  await audit(userId, 'reorder', 'achievement', null, { count: ids.length });
  revalidate([TAGS.achievements], PATHS());
}

export async function attachAchievementAsset(
  achievementId: string,
  mediaId: string,
  role: AchievementAssetRole,
  userId: string,
) {
  const [a, media] = await Promise.all([
    prisma.achievement.findUnique({ where: { id: achievementId } }),
    prisma.mediaAsset.findUnique({ where: { id: mediaId } }),
  ]);
  if (!a) throw new HttpError(404, 'Achievement not found');
  if (!media) throw new HttpError(404, 'Media not found');
  if (role !== 'CERTIFICATE' && media.kind !== 'IMAGE')
    throw new HttpError(422, 'Previews, photos and gallery items must be images');
  if (role === 'CERTIFICATE' && media.kind !== 'IMAGE' && media.kind !== 'PDF')
    throw new HttpError(422, 'Certificates must be an image or a PDF');

  // Only one certificate original and one preview per record: replace previous link.
  if (role === 'CERTIFICATE' || role === 'PREVIEW') {
    const previous = await prisma.achievementAsset.findMany({ where: { achievementId, role } });
    await prisma.achievementAsset.deleteMany({ where: { achievementId, role } });
    await recomputeMediaVisibility(previous.map((p) => p.mediaId));
  }
  const count = await prisma.achievementAsset.count({ where: { achievementId, role } });
  const asset = await prisma.achievementAsset.upsert({
    where: { achievementId_mediaId_role: { achievementId, mediaId, role } },
    update: {},
    create: { achievementId, mediaId, role, order: count },
  });
  await recomputeMediaVisibility([mediaId]);
  await audit(userId, `attach:${role}`, 'achievement', achievementId, { mediaId });
  revalidate([TAGS.achievements], PATHS(a.slug));
  return asset;
}

export async function detachAchievementAsset(
  achievementId: string,
  assetId: string,
  userId: string,
) {
  const asset = await prisma.achievementAsset.findFirst({ where: { id: assetId, achievementId } });
  if (!asset) throw new HttpError(404, 'Asset link not found');
  await prisma.achievementAsset.delete({ where: { id: assetId } });
  await recomputeMediaVisibility([asset.mediaId]);
  await audit(userId, 'detach', 'achievement', achievementId, {
    mediaId: asset.mediaId,
    role: asset.role,
  });
  const a = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: { slug: true },
  });
  revalidate([TAGS.achievements], PATHS(a?.slug));
}

export async function reorderAchievementAssets(
  achievementId: string,
  assetIds: string[],
  userId: string,
) {
  await prisma.$transaction(
    assetIds.map((id, order) =>
      prisma.achievementAsset.updateMany({ where: { id, achievementId }, data: { order } }),
    ),
  );
  await audit(userId, 'reorder-assets', 'achievement', achievementId);
  revalidate([TAGS.achievements], PATHS());
}

/**
 * Replaces the media behind an asset link while keeping its role, order, alt text and caption.
 * The previous file is kept (and may be removed from the media library separately).
 */
export async function replaceAchievementAsset(
  achievementId: string,
  assetId: string,
  newMediaId: string,
  userId: string,
) {
  const link = await prisma.achievementAsset.findFirst({
    where: { id: assetId, achievementId },
    include: { media: true },
  });
  if (!link) throw new HttpError(404, 'Asset link not found');
  const replacement = await prisma.mediaAsset.findUnique({ where: { id: newMediaId } });
  if (!replacement) throw new HttpError(404, 'Replacement media not found');
  await prisma.$transaction([
    prisma.mediaAsset.update({
      where: { id: newMediaId },
      data: {
        alt: replacement.alt || link.media.alt,
        caption: replacement.caption ?? link.media.caption,
      },
    }),
    prisma.achievementAsset.update({ where: { id: assetId }, data: { mediaId: newMediaId } }),
  ]);
  await recomputeMediaVisibility([link.mediaId, newMediaId]);
  await audit(userId, 'replace-asset', 'achievement', achievementId, {
    from: link.mediaId,
    to: newMediaId,
  });
  revalidate([TAGS.achievements], PATHS());
}

/** Crops the certificate original into a new PREVIEW (original stays intact and private). */
export async function cropAchievementPreview(
  achievementId: string,
  mediaId: string,
  box: { x: number; y: number; width: number; height: number },
  userId: string,
  alt?: string,
) {
  const link = await prisma.achievementAsset.findFirst({ where: { achievementId, mediaId } });
  if (!link) throw new HttpError(404, 'That file is not attached to this achievement');
  const derived = await createCroppedDerivative(mediaId, box, alt);
  await attachAchievementAsset(achievementId, derived.id, 'PREVIEW', userId);
  return derived;
}
