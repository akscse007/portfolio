import 'server-only';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import type { MediaAsset, MediaKind, Visibility } from '@prisma/client';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { sha256 } from '@/lib/security/tokens';
import { sanitizeFilename, sniffFileType } from '@/lib/media/sniff';
import { HttpError } from '@/lib/api';

sharp.cache(false);

export const MEDIA_LIMITS = {
  IMAGE: () => Number(process.env.MAX_IMAGE_MB || 15) * 1024 * 1024,
  PDF: () => Number(process.env.MAX_PDF_MB || 20) * 1024 * 1024,
  VIDEO: () => Number(process.env.MAX_VIDEO_MB || 200) * 1024 * 1024,
  DOCUMENT: () => 2 * 1024 * 1024,
};

const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 80_000_000;

export const IMAGE_VARIANTS = {
  thumb: { width: 560, quality: 72 },
  display: { width: 1800, quality: 82 },
} as const;
export type ImageVariant = keyof typeof IMAGE_VARIANTS;
export type Variants = Partial<Record<ImageVariant, string>>;

function newKeyBase() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}/${mm}/${randomBytes(18).toString('base64url')}`;
}

export type IngestOptions = {
  buffer: Buffer;
  originalName: string;
  declaredMime?: string | null;
  alt?: string;
  caption?: string | null;
  visibility?: Visibility;
  allowedKinds?: MediaKind[];
  derivedFromId?: string | null;
};

/** Validates, normalises and stores an upload; returns the created MediaAsset row. */
export async function ingestUpload(opts: IngestOptions): Promise<MediaAsset> {
  const { buffer } = opts;
  if (!buffer.length) throw new HttpError(400, 'The file is empty');

  const sniffed = sniffFileType(buffer.subarray(0, 64));
  if (!sniffed)
    throw new HttpError(
      415,
      'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF, PDF, MP4, WebM, VTT.',
    );
  const allowed = opts.allowedKinds ?? ['IMAGE', 'PDF', 'VIDEO', 'DOCUMENT'];
  if (!allowed.includes(sniffed.kind))
    throw new HttpError(415, `This field does not accept ${sniffed.kind.toLowerCase()} files`);

  if (opts.declaredMime) {
    const declaredMajor = opts.declaredMime.split('/')[0];
    const realMajor = sniffed.mime.split('/')[0];
    if (
      declaredMajor &&
      declaredMajor !== realMajor &&
      opts.declaredMime !== 'application/octet-stream'
    )
      throw new HttpError(415, 'File content does not match its declared type');
  }

  const limit = MEDIA_LIMITS[sniffed.kind]();
  if (buffer.length > limit)
    throw new HttpError(
      413,
      `File too large. Limit for ${sniffed.kind.toLowerCase()} is ${Math.round(limit / 1048576)} MB`,
    );

  const base = newKeyBase();
  const key = `${base}.${sniffed.ext}`;
  const store = storage();
  let width: number | null = null;
  let height: number | null = null;
  const variants: Variants = {};
  const written: string[] = [];

  try {
    if (sniffed.kind === 'IMAGE') {
      let meta: sharp.Metadata;
      try {
        meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
      } catch {
        throw new HttpError(422, 'The image could not be decoded');
      }
      if (!meta.width || !meta.height) throw new HttpError(422, 'The image has no dimensions');
      if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION)
        throw new HttpError(422, `Image dimensions exceed ${MAX_DIMENSION}px`);
      // EXIF orientation: swap reported dimensions for rotated images
      const rotated = (meta.orientation ?? 1) >= 5;
      width = rotated ? meta.height : meta.width;
      height = rotated ? meta.width : meta.height;

      for (const [name, cfg] of Object.entries(IMAGE_VARIANTS) as [
        ImageVariant,
        (typeof IMAGE_VARIANTS)[ImageVariant],
      ][]) {
        // Variants are re-encoded: strips EXIF/GPS metadata and any trailing payloads.
        const out = await sharp(buffer, { limitInputPixels: MAX_PIXELS, animated: false })
          .rotate()
          .resize({ width: Math.min(cfg.width, width), withoutEnlargement: true })
          .webp({ quality: cfg.quality })
          .toBuffer();
        const vKey = `${base}.${name}.webp`;
        await store.put(vKey, out, 'image/webp');
        written.push(vKey);
        variants[name] = vKey;
      }
    } else if (sniffed.kind === 'PDF') {
      const head = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('latin1');
      const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('latin1');
      if (!head.startsWith('%PDF-') || !tail.includes('%%EOF'))
        throw new HttpError(422, 'The PDF appears to be truncated or malformed');
    } else if (sniffed.kind === 'DOCUMENT') {
      const text = buffer.toString('utf8');
      if (/<script/i.test(text))
        throw new HttpError(422, 'Caption file contains disallowed content');
    }

    await store.put(key, buffer, sniffed.mime);
    written.push(key);

    return await prisma.mediaAsset.create({
      data: {
        key,
        kind: sniffed.kind,
        mimeType: sniffed.mime,
        sizeBytes: buffer.length,
        width,
        height,
        variants: Object.keys(variants).length ? variants : undefined,
        checksum: sha256(buffer),
        originalName: sanitizeFilename(opts.originalName),
        alt: (opts.alt ?? '').slice(0, 300),
        caption: opts.caption ?? null,
        visibility: opts.visibility ?? 'PRIVATE',
        derivedFromId: opts.derivedFromId ?? null,
      },
    });
  } catch (err) {
    await Promise.all(written.map((k) => store.delete(k).catch(() => undefined)));
    throw err;
  }
}

/** Creates a cropped public-preview candidate from an image original, leaving the original untouched. */
export async function createCroppedDerivative(
  originalId: string,
  box: { x: number; y: number; width: number; height: number },
  alt?: string,
) {
  const original = await prisma.mediaAsset.findUnique({ where: { id: originalId } });
  if (!original) throw new HttpError(404, 'Original media not found');
  if (original.kind !== 'IMAGE' || !original.width || !original.height)
    throw new HttpError(422, 'Only images can be cropped');
  const buf = await storage().getBuffer(original.key);
  if (!buf) throw new HttpError(404, 'Original file is missing from storage');

  const left = Math.round(box.x * original.width);
  const top = Math.round(box.y * original.height);
  const width = Math.min(original.width - left, Math.round(box.width * original.width));
  const height = Math.min(original.height - top, Math.round(box.height * original.height));
  if (width < 16 || height < 16) throw new HttpError(422, 'Crop area is too small');

  const cropped = await sharp(buf, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .extract({ left, top, width, height })
    .png()
    .toBuffer();

  return ingestUpload({
    buffer: cropped,
    originalName: `${original.originalName.replace(/\.[^.]+$/, '')}-preview.png`,
    alt: alt ?? original.alt,
    visibility: 'PRIVATE',
    allowedKinds: ['IMAGE'],
    derivedFromId: original.id,
  });
}

export function mediaVariantKey(asset: Pick<MediaAsset, 'key' | 'variants'>, variant: string) {
  if (variant === 'original') return asset.key;
  const v = (asset.variants ?? {}) as Variants;
  return v[variant as ImageVariant] ?? asset.key;
}

/** Where is this asset used? Returns human-readable references. */
export async function mediaUsage(id: string) {
  const [
    projectMedia,
    projectCovers,
    achievementAssets,
    postCovers,
    videos,
    profile,
    settings,
    inlinePosts,
  ] = await Promise.all([
    prisma.projectMedia.findMany({
      where: { mediaId: id },
      select: { project: { select: { id: true, title: true } } },
    }),
    prisma.project.findMany({ where: { coverId: id }, select: { id: true, title: true } }),
    prisma.achievementAsset.findMany({
      where: { mediaId: id },
      select: { role: true, achievement: { select: { id: true, title: true } } },
    }),
    prisma.post.findMany({ where: { coverId: id }, select: { id: true, title: true } }),
    prisma.video.findMany({
      where: { OR: [{ posterId: id }, { fileId: id }, { captionsId: id }] },
      select: { id: true, title: true },
    }),
    prisma.profile.findFirst({
      where: { OR: [{ cvMediaId: id }, { portraitMediaId: id }] },
      select: { id: true },
    }),
    prisma.siteSettings.findFirst({ where: { defaultOgMediaId: id }, select: { id: true } }),
    prisma.post.findMany({
      where: { content: { contains: `/media/${id}` } },
      select: { id: true, title: true },
    }),
  ]);
  const refs: { type: string; id: string; label: string }[] = [];
  projectMedia.forEach((r) =>
    refs.push({ type: 'project', id: r.project.id, label: `Project gallery · ${r.project.title}` }),
  );
  projectCovers.forEach((p) =>
    refs.push({ type: 'project', id: p.id, label: `Project cover · ${p.title}` }),
  );
  achievementAssets.forEach((a) =>
    refs.push({
      type: 'achievement',
      id: a.achievement.id,
      label: `Achievement ${a.role.toLowerCase()} · ${a.achievement.title}`,
    }),
  );
  postCovers.forEach((p) =>
    refs.push({ type: 'post', id: p.id, label: `Post cover · ${p.title}` }),
  );
  inlinePosts.forEach((p) =>
    refs.push({ type: 'post', id: p.id, label: `Inline image · ${p.title}` }),
  );
  videos.forEach((v) => refs.push({ type: 'video', id: v.id, label: `Video · ${v.title}` }));
  if (profile) refs.push({ type: 'profile', id: profile.id, label: 'Profile (CV / portrait)' });
  if (settings) refs.push({ type: 'settings', id: settings.id, label: 'Default social image' });
  return refs;
}

const MEDIA_ID_IN_MARKDOWN = /\/media\/([a-z0-9]{20,40})/gi;

export function mediaIdsInMarkdown(markdown: string): string[] {
  return Array.from(new Set(Array.from(markdown.matchAll(MEDIA_ID_IN_MARKDOWN), (m) => m[1]!)));
}

/**
 * Recomputes the visibility of referenced assets from the publication state of every
 * record that uses them. Unreferenced assets keep their manual visibility.
 * This is the single source of truth that keeps drafts and unapproved certificates private.
 */
export async function recomputeMediaVisibility(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
  for (const id of unique) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, visibility: true },
    });
    if (!asset) continue;
    const [
      projectMedia,
      projectCover,
      achievementAssets,
      postCover,
      videoRefs,
      profileRef,
      settingsRef,
      inlinePublished,
      inlineAny,
    ] = await Promise.all([
      prisma.projectMedia.findMany({
        where: { mediaId: id },
        select: { project: { select: { status: true } } },
      }),
      prisma.project.findMany({ where: { coverId: id }, select: { status: true } }),
      prisma.achievementAsset.findMany({
        where: { mediaId: id },
        select: {
          role: true,
          achievement: { select: { status: true, previewApproved: true, documentPublic: true } },
        },
      }),
      prisma.post.findMany({ where: { coverId: id }, select: { status: true } }),
      prisma.video.findMany({
        where: { OR: [{ posterId: id }, { fileId: id }, { captionsId: id }] },
        select: { status: true },
      }),
      prisma.profile.count({ where: { OR: [{ cvMediaId: id }, { portraitMediaId: id }] } }),
      prisma.siteSettings.count({ where: { defaultOgMediaId: id } }),
      prisma.post.count({ where: { status: 'PUBLISHED', content: { contains: `/media/${id}` } } }),
      prisma.post.count({ where: { content: { contains: `/media/${id}` } } }),
    ]);

    const referenced =
      projectMedia.length +
        projectCover.length +
        achievementAssets.length +
        postCover.length +
        videoRefs.length +
        profileRef +
        settingsRef +
        inlineAny >
      0;
    if (!referenced) continue;

    const isPublic =
      projectMedia.some((r) => r.project.status === 'PUBLISHED') ||
      projectCover.some((r) => r.status === 'PUBLISHED') ||
      postCover.some((r) => r.status === 'PUBLISHED') ||
      videoRefs.some((r) => r.status === 'PUBLISHED') ||
      profileRef > 0 ||
      settingsRef > 0 ||
      inlinePublished > 0 ||
      achievementAssets.some(
        (a) =>
          a.achievement.status === 'PUBLISHED' &&
          (a.role === 'CERTIFICATE' ? a.achievement.documentPublic : a.achievement.previewApproved),
      );
    const desired: Visibility = isPublic ? 'PUBLIC' : 'PRIVATE';
    if (desired !== asset.visibility) {
      await prisma.mediaAsset.update({ where: { id }, data: { visibility: desired } });
    }
  }
}

export async function deleteMediaAsset(id: string, { force = false } = {}) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new HttpError(404, 'Media not found');
  const usage = await mediaUsage(id);
  if (usage.length && !force) throw new HttpError(409, 'This file is still in use', { usage });
  await prisma.mediaAsset.delete({ where: { id } });
  const store = storage();
  const keys = [asset.key, ...Object.values((asset.variants ?? {}) as Variants)];
  await Promise.all(keys.map((k) => (k ? store.delete(k).catch(() => undefined) : undefined)));
  return asset;
}

/**
 * Lists storage objects with no database row and assets with no references that are older
 * than `olderThanHours`. Nothing is deleted unless `apply` is true.
 */
export async function findOrphans({ olderThanHours = 24, apply = false } = {}) {
  const store = storage();
  const rows = await prisma.mediaAsset.findMany({
    select: { id: true, key: true, variants: true, createdAt: true },
  });
  const known = new Set<string>();
  for (const r of rows) {
    known.add(r.key);
    Object.values((r.variants ?? {}) as Variants).forEach((k) => k && known.add(k));
  }
  const objects = await store.list();
  const strayObjects = objects.filter((k) => !known.has(k));

  const cutoff = Date.now() - olderThanHours * 3600 * 1000;
  const unreferenced: string[] = [];
  for (const r of rows) {
    if (r.createdAt.getTime() > cutoff) continue;
    if ((await mediaUsage(r.id)).length === 0) unreferenced.push(r.id);
  }

  if (apply) {
    await Promise.all(strayObjects.map((k) => store.delete(k).catch(() => undefined)));
    for (const id of unreferenced) await deleteMediaAsset(id).catch(() => undefined);
  }
  return { strayObjects, unreferenced };
}

export function publicMediaUrl(
  id: string | null | undefined,
  variant: 'thumb' | 'display' | 'original' = 'display',
) {
  if (!id) return null;
  return variant === 'original' ? `/media/${id}` : `/media/${id}?v=${variant}`;
}
