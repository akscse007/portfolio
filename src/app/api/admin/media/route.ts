import type { MediaKind, Prisma } from '@prisma/client';
import { adminRoute, HttpError, json } from '@/lib/api';
import { prisma } from '@/lib/db';
import { hitRateLimit } from '@/lib/security/rate-limit';
import { cuidLike } from '@/lib/validation/schemas';
import { ingestUpload } from '@/server/services/media';
import { audit } from '@/server/services/common';

const KINDS: MediaKind[] = ['IMAGE', 'PDF', 'VIDEO', 'DOCUMENT'];
const MAX_REQUEST_BYTES = (Number(process.env.MAX_VIDEO_MB || 200) + 2) * 1024 * 1024;

export const GET = adminRoute(async (req) => {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.MediaAssetWhereInput = {};
  const kind = sp.get('kind');
  if (kind && KINDS.includes(kind as MediaKind)) where.kind = kind as MediaKind;
  const vis = sp.get('visibility');
  if (vis === 'PUBLIC' || vis === 'PRIVATE') where.visibility = vis;
  const q = sp.get('q')?.slice(0, 100);
  if (q)
    where.OR = [
      { originalName: { contains: q, mode: 'insensitive' } },
      { alt: { contains: q, mode: 'insensitive' } },
    ];
  const page = Math.max(1, Number(sp.get('page') || 1));
  const take = Math.min(100, Math.max(1, Number(sp.get('take') || 48)));
  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.mediaAsset.count({ where }),
  ]);
  return json({ items, total, page, take });
});

/**
 * Multipart upload: fields `file` (required), `alt`, `caption`, `accept` (comma-separated kinds),
 * `derivedFromId` (for previews generated client-side, e.g. a PDF's first page).
 */
export const POST = adminRoute(async (req, { session }) => {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_REQUEST_BYTES) throw new HttpError(413, 'Upload exceeds the maximum request size');
  const rl = await hitRateLimit(`upload:${session.user.id}`, 300, 3600);
  if (!rl.allowed) throw new HttpError(429, 'Upload limit reached. Try again later.');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, 'Expected multipart/form-data');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'No file provided');
  const accept = String(form.get('accept') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((k): k is MediaKind => KINDS.includes(k as MediaKind));
  const derivedRaw = form.get('derivedFromId');
  const derivedFromId = derivedRaw ? cuidLike.parse(String(derivedRaw)) : null;
  if (derivedFromId && !(await prisma.mediaAsset.findUnique({ where: { id: derivedFromId } })))
    throw new HttpError(400, 'Original media not found');

  const buffer = Buffer.from(await file.arrayBuffer());
  const media = await ingestUpload({
    buffer,
    originalName: file.name || 'upload',
    declaredMime: file.type || null,
    alt: String(form.get('alt') || '').slice(0, 300),
    caption: form.get('caption') ? String(form.get('caption')).slice(0, 500) : null,
    visibility: 'PRIVATE',
    allowedKinds: accept.length ? accept : undefined,
    derivedFromId,
  });
  await audit(session.user.id, 'upload', 'media', media.id, {
    kind: media.kind,
    size: media.sizeBytes,
  });
  return json({ media }, { status: 201 });
});
