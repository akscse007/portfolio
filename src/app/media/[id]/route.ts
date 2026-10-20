import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { SESSION_COOKIE, getSessionByToken } from '@/lib/auth';
import { mediaVariantKey } from '@/server/services/media';
import { assertValidKey } from '@/lib/storage/types';

export const dynamic = 'force-dynamic';

const ID_RE = /^[a-z0-9]{20,40}$/i;
const VARIANTS = new Set(['thumb', 'display', 'original']);

function notFound() {
  // Private and missing media are indistinguishable to the public.
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

function contentDisposition(name: string, download: boolean) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Access-checked media delivery.
 *   GET /media/:id?v=thumb|display|original[&download=1]
 * PUBLIC assets are served to everyone; PRIVATE assets only to an authenticated admin.
 * Visibility is derived from publication state (see recomputeMediaVisibility).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return notFound();
  const variant = req.nextUrl.searchParams.get('v') ?? 'original';
  if (!VARIANTS.has(variant)) return notFound();
  const download = req.nextUrl.searchParams.get('download') === '1';

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return notFound();

  let isAdmin = false;
  if (asset.visibility !== 'PUBLIC') {
    const session = await getSessionByToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return notFound();
    isAdmin = true;
  }

  const key = mediaVariantKey(asset, variant);
  const isVariant = key !== asset.key;
  const mime = isVariant ? 'image/webp' : asset.mimeType;
  const filename = isVariant
    ? asset.originalName.replace(/\.[^.]+$/, '') + `-${variant}.webp`
    : asset.originalName;
  const etag = `"${asset.checksum.slice(0, 16)}-${variant}-${asset.updatedAt.getTime()}"`;
  const cacheControl =
    isAdmin || asset.visibility !== 'PUBLIC'
      ? 'private, no-store'
      : 'public, max-age=300, stale-while-revalidate=3600';

  const baseHeaders: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': contentDisposition(filename, download),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': cacheControl,
    ETag: etag,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Robots-Tag': asset.visibility === 'PUBLIC' ? 'noai, noimageai' : 'noindex, nofollow',
  };
  // Images/captions can never execute script; PDFs are left to the browser's viewer.
  if (asset.kind !== 'PDF')
    baseHeaders['Content-Security-Policy'] =
      "default-src 'none'; style-src 'unsafe-inline'; sandbox";

  if (req.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers: baseHeaders });

  const store = storage();

  // Object storage: redirect to a short-lived signed URL (supports range requests natively).
  if (store.name === 's3') {
    const url = await store.signedUrl(key, {
      contentType: mime,
      disposition: baseHeaders['Content-Disposition']!,
    });
    if (!url) return notFound();
    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Cache-Control': 'private, max-age=0, no-store' },
    });
  }

  // Local storage: stream from disk, with HTTP range support for video seeking.
  assertValidKey(key);
  const root = path.resolve(process.env.LOCAL_STORAGE_DIR || './storage', 'objects');
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) return notFound();
  let size: number;
  try {
    size = (await stat(full)).size;
  } catch {
    return notFound();
  }

  const range = req.headers.get('range');
  if (range) {
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!m)
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    if (!m[1] && !m[2])
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end)
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const stream = createReadStream(full, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const obj = await store.get(key);
  if (!obj) return notFound();
  return new Response(Readable.toWeb(obj.body) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, 'Accept-Ranges': 'bytes', 'Content-Length': String(size) },
  });
}
